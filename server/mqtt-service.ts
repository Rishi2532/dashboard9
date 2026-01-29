import mqtt from "mqtt";
import { getDB } from "./db";
import { topicsLastSeen } from "@shared/schema";
import { sql } from "drizzle-orm";

// MQTT Configuration - Multiple brokers
const MQTT_BROKERS = [
  {
    name: "Primary Server",
    host: process.env.MQTT_HOST || "14.99.99.166",
    port: parseInt(process.env.MQTT_PORT || "1889"),
    username: process.env.MQTT_USERNAME || "MQTT",
    password: process.env.MQTT_PASSWORD || "Mqtt@123",
  },
  {
    name: "Secondary Server",
    host: process.env.MQTT_HOST_2 || "49.50.99.188",
    port: parseInt(process.env.MQTT_PORT_2 || "1883"),
    username: process.env.MQTT_USERNAME_2 || "MQTT",
    password: process.env.MQTT_PASSWORD_2 || "Mqtt@123",
  }
];

interface BrokerConnection {
  name: string;
  client: mqtt.MqttClient;
  isConnected: boolean;
  reconnectAttempts: number;
}

export class MQTTService {
  private connections: BrokerConnection[] = [];
  private db: any = null;
  private maxReconnectAttempts: number = 10;
  private isDatabaseReady: boolean = false;
  
  // Performance optimization properties
  private messageCache: Map<string, { value: string; lastSeen: number; brokerServer: string }> = new Map();
  private pendingUpdates: Map<string, { value: string; lastSeen: number; brokerServer: string }> = new Map();
  private batchUpdateTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_INTERVAL = 10000; // Update database every 10 seconds
  private readonly CACHE_EXPIRY = 60000; // Cache messages for 1 minute

  constructor() {
    this.initializeDatabase();
    this.startBatchProcessor();
  }

  private async initializeDatabase() {
    try {
      this.db = await getDB();
      
      // Ensure the topics_last_seen table exists
      await this.ensureTopicsTableExists();
      
      this.isDatabaseReady = true;
      console.log("MQTT Service: Database connection established");
    } catch (error) {
      console.error("MQTT Service: Failed to connect to database:", error);
      // Retry database connection after 5 seconds
      setTimeout(() => this.initializeDatabase(), 5000);
    }
  }

  private async ensureTopicsTableExists() {
    try {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS "topics_last_seen" (
          "topic_id" TEXT PRIMARY KEY,
          "last_value" TEXT,
          "last_seen" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          "broker_server" TEXT
        );
      `);
      
      // PERMANENT FIX: Safely upgrade TIMESTAMP to TIMESTAMPTZ only if needed
      // This prevents double-conversion issues on every startup
      try {
        const columnCheck = await this.db.execute(sql`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'topics_last_seen' 
          AND column_name = 'last_seen'
          AND table_schema = 'public'
        `);
        
        if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'timestamp without time zone') {
          await this.db.execute(sql`
            ALTER TABLE "topics_last_seen" 
            ALTER COLUMN "last_seen" TYPE TIMESTAMPTZ USING "last_seen" AT TIME ZONE 'UTC';
          `);
          console.log("MQTT Service: Upgraded last_seen column from TIMESTAMP to TIMESTAMPTZ");
        }
      } catch (error) {
        console.error("MQTT Service: Failed to check/upgrade timestamp column:", error);
      }
      console.log("MQTT Service: topics_last_seen table verified/created");
      
      // PERMANENT FIX: Clean up any existing topic_ids with leading/trailing spaces
      // This ensures all topic queries work correctly regardless of how they were stored
      try {
        const cleanupResult = await this.db.execute(sql`
          UPDATE "topics_last_seen" 
          SET topic_id = TRIM(topic_id) 
          WHERE topic_id != TRIM(topic_id)
        `);
        if (cleanupResult.rowCount && cleanupResult.rowCount > 0) {
          console.log(`MQTT Service: Cleaned up ${cleanupResult.rowCount} topic_ids with leading/trailing spaces`);
        }
      } catch (error) {
        console.error("MQTT Service: Failed to clean up topic_ids:", error);
      }
      
      // PERMANENT FIX: UTC timestamp storage is now the standard
      // No normalization needed - timestamps stored as UTC for global consistency
      console.log("MQTT Service: Using UTC timestamp storage for consistent global deployment");
      
    } catch (error) {
      console.error("MQTT Service: Failed to create topics_last_seen table:", error);
      throw error;
    }
  }

  public async connect(): Promise<void> {
    // Connect to all configured MQTT brokers
    for (const config of MQTT_BROKERS) {
      await this.connectToBroker(config);
    }
  }

  private async connectToBroker(config: typeof MQTT_BROKERS[0]): Promise<void> {
    // Check if already connected to this broker
    const existing = this.connections.find(c => c.name === config.name);
    if (existing && existing.isConnected) {
      console.log(`MQTT Service: Already connected to ${config.name}`);
      return;
    }

    try {
      const brokerUrl = `mqtt://${config.host}:${config.port}`;
      console.log(`MQTT Service: Connecting to ${config.name} (${config.host}:${config.port})...`);
      
      const client = mqtt.connect(brokerUrl, {
        username: config.username,
        password: config.password,
        keepalive: 60,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        clean: true,
      });

      const connection: BrokerConnection = {
        name: config.name,
        client: client,
        isConnected: false,
        reconnectAttempts: 0,
      };

      client.on("connect", () => {
        console.log(`MQTT Service: Connected to ${config.name}`);
        connection.isConnected = true;
        connection.reconnectAttempts = 0;
        
        // Subscribe to all topics
        client.subscribe("#", (err) => {
          if (err) {
            console.error(`MQTT Service (${config.name}): Failed to subscribe to topics:`, err);
          } else {
            console.log(`MQTT Service (${config.name}): Subscribed to all topics (#)`);
          }
        });
      });

      client.on("message", async (topic, message) => {
        // Handle binary messages by safely converting to string
        const messageStr = this.sanitizeMessage(message);
        await this.handleMessage(topic, messageStr, config.name);
      });

      client.on("error", (error) => {
        console.error(`MQTT Service (${config.name}): Connection error:`, error);
        connection.isConnected = false;
      });

      client.on("close", () => {
        console.log(`MQTT Service (${config.name}): Connection closed`);
        connection.isConnected = false;
        this.handleReconnect(connection, config);
      });

      client.on("offline", () => {
        console.log(`MQTT Service (${config.name}): Client offline`);
        connection.isConnected = false;
      });

      // Add connection to the list
      if (existing) {
        // Replace existing connection
        const index = this.connections.indexOf(existing);
        this.connections[index] = connection;
      } else {
        this.connections.push(connection);
      }

    } catch (error) {
      console.error(`MQTT Service (${config.name}): Failed to connect:`, error);
    }
  }

  private handleReconnect(connection: BrokerConnection, config: typeof MQTT_BROKERS[0]): void {
    if (connection.reconnectAttempts < this.maxReconnectAttempts) {
      connection.reconnectAttempts++;
      console.log(`MQTT Service (${config.name}): Attempting to reconnect (${connection.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connectToBroker(config), 5000 * connection.reconnectAttempts);
    } else {
      console.error(`MQTT Service (${config.name}): Max reconnection attempts reached`);
    }
  }

  private sanitizeMessage(message: Buffer): string {
    try {
      // Convert buffer to string, handling potential binary data
      let messageStr = message.toString('utf8');
      
      // Remove null bytes and other problematic characters
      messageStr = messageStr.replace(/\0/g, ''); // Remove null bytes
      
      // Remove other non-printable control characters except newlines and tabs
      messageStr = messageStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Truncate very long messages to prevent database issues
      if (messageStr.length > 10000) {
        messageStr = messageStr.substring(0, 10000) + '...[truncated]';
      }
      
      return messageStr;
    } catch (error) {
      // If conversion fails, return a safe placeholder
      return `[Binary data - ${message.length} bytes]`;
    }
  }

  private startBatchProcessor(): void {
    // Process pending updates every BATCH_INTERVAL
    this.batchUpdateTimer = setInterval(() => {
      this.processPendingUpdates();
    }, this.BATCH_INTERVAL);
  }

  private async processPendingUpdates(): Promise<void> {
    if (!this.db || !this.isDatabaseReady || this.pendingUpdates.size === 0) {
      return;
    }

    try {
      // Process all pending updates in a single transaction
      const updates = Array.from(this.pendingUpdates.entries());
      this.pendingUpdates.clear();

      if (updates.length > 0) {
        // Use a transaction for better performance
        for (const [topic, data] of updates) {
          // PERMANENT FIX: Store timestamps as UTC to avoid timezone conversion issues
          // This ensures consistent behavior across all deployments and remixes
          const utcTimestamp = data.lastSeen / 1000; // Convert to UTC seconds
          
          try {
            await this.db.execute(sql`
              INSERT INTO topics_last_seen (topic_id, last_value, last_seen, broker_server) 
              VALUES (${topic}, ${data.value}, to_timestamp(${utcTimestamp}), ${data.brokerServer})
              ON CONFLICT (topic_id) 
              DO UPDATE SET 
                last_value = ${data.value}, 
                last_seen = to_timestamp(${utcTimestamp}),
                broker_server = ${data.brokerServer}
            `);
          } catch (error: any) {
            // If table doesn't exist error, try to recreate it
            if (error.code === '42P01') {
              console.log("MQTT Service: Table doesn't exist, attempting to recreate...");
              await this.ensureTopicsTableExists();
              // Retry the insert with UTC timestamp
              await this.db.execute(sql`
                INSERT INTO topics_last_seen (topic_id, last_value, last_seen, broker_server) 
                VALUES (${topic}, ${data.value}, to_timestamp(${utcTimestamp}), ${data.brokerServer})
                ON CONFLICT (topic_id) 
                DO UPDATE SET 
                  last_value = ${data.value}, 
                  last_seen = to_timestamp(${utcTimestamp}),
                  broker_server = ${data.brokerServer}
              `);
            } else {
              throw error;
            }
          }
        }
        
        // Only log batch processing, not individual messages
        console.log(`MQTT Service: Processed ${updates.length} topic updates`);
      }
    } catch (error) {
      console.error("MQTT Service: Failed to process batch updates:", error);
    }
  }

  private async handleMessage(topic: string, message: string, brokerName: string): Promise<void> {
    if (!this.db || !this.isDatabaseReady) {
      // Don't log every dropped message to reduce noise
      return;
    }

    // PERMANENT FIX: Trim topic ID to remove leading/trailing spaces
    // This prevents issues where topics are stored with spaces and can't be found
    const trimmedTopic = topic.trim();

    const now = Date.now();
    const cachedMessage = this.messageCache.get(trimmedTopic);

    // Always update timestamp for monitoring purposes (we want to know when we last heard from the device)
    // Only skip database updates if the message content is identical AND was very recently processed
    const isRecentDuplicate = cachedMessage && 
                             cachedMessage.value === message && 
                             (now - cachedMessage.lastSeen) < 5000; // Only skip if duplicate within 5 seconds

    if (!isRecentDuplicate) {
      // FIXED: Store proper UTC timestamps without manual timezone adjustments
      // This ensures consistent timezone handling across all deployments and remixes
      
      // Always update cache with UTC timestamp and broker server info (use trimmed topic)
      this.messageCache.set(trimmedTopic, { value: message, lastSeen: now, brokerServer: brokerName });
      
      // Always add to pending updates with UTC timestamp and broker server info (use trimmed topic)
      this.pendingUpdates.set(trimmedTopic, { value: message, lastSeen: now, brokerServer: brokerName });
    }
  }

  public async getTopicStatus(topicId: string): Promise<{
    topic: string;
    status: "communicating" | "not communicated";
    last_seen: string | null;
    last_value: string | null;
    broker_server: string | null;
  }> {
    if (!this.db) {
      throw new Error("Database not available");
    }

    try {
      // PERMANENT FIX: Trim topicId and also search for both trimmed and untrimmed versions
      // This handles cases where topics were stored with leading/trailing spaces
      const trimmedTopicId = topicId.trim();
      
      const result = await this.db.execute(sql`
        SELECT topic_id, last_value, last_seen, broker_server 
        FROM topics_last_seen 
        WHERE topic_id = ${trimmedTopicId} OR topic_id = ${topicId}
        ORDER BY last_seen DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return {
          topic: topicId,
          status: "not communicated",
          last_seen: null,
          last_value: null,
          broker_server: null,
        };
      }

      const row = result.rows[0];
      const lastSeen = new Date(row.last_seen);
      const now = new Date();
      
      // PERMANENT FIX: Compare UTC timestamps directly without timezone conversion
      // Database now stores UTC timestamps, so direct comparison is accurate
      const timeDiffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
      
      // Consider a topic as "not communicating" if no message received in last 30 minutes
      // Increased from 10 to 30 minutes to be more forgiving for intermittent connections
      const status = timeDiffMinutes <= 30 ? "communicating" : "not communicated";

      return {
        topic: topicId,
        status,
        last_seen: row.last_seen,
        last_value: row.last_value,
        broker_server: row.broker_server || null,
      };
    } catch (error) {
      console.error("MQTT Service: Failed to get topic status:", error);
      throw error;
    }
  }

  public disconnect(): void {
    // Disconnect from all brokers
    for (const connection of this.connections) {
      if (connection.client) {
        connection.client.end();
        connection.isConnected = false;
        console.log(`MQTT Service: Disconnected from ${connection.name}`);
      }
    }
    
    this.connections = [];
    
    // Clean up batch processor timer
    if (this.batchUpdateTimer) {
      clearInterval(this.batchUpdateTimer);
      this.batchUpdateTimer = null;
    }
    
    // Process any remaining pending updates before shutdown
    if (this.pendingUpdates.size > 0) {
      this.processPendingUpdates();
    }
  }

  public isConnectedToBroker(): boolean {
    // Return true if at least one broker is connected
    return this.connections.some(c => c.isConnected);
  }

  public getConnectionStatus(): Array<{ name: string; connected: boolean }> {
    return this.connections.map(c => ({
      name: c.name,
      connected: c.isConnected
    }));
  }
}

// Create and export a singleton instance
export const mqttService = new MQTTService();

// Initialize the service
mqttService.connect().catch(console.error);
