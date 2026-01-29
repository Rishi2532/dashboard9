import { createChatBotMessage } from "react-chatbot-kit";

// Define the configuration object
const config = {
  initialMessages: [
    createChatBotMessage(
      "Hello! I'm your Maharashtra Water Infrastructure Assistant. How can I help you today?",
      {
        delay: 500,
        widget: "welcomeOptions",
      },
    ),
  ],
  botName: "Water Infrastructure Assistant",
  customStyles: {
    botMessageBox: {
      backgroundColor: "#9333ea", // Purple color
    },
    chatButton: {
      backgroundColor: "#d946ef", // Pink color
    },
  },
  widgets: [
    {
      widgetName: "schemeStatus",
      widgetFunc: (props: any) => {
        return {
          props,
          type: "schemeStatus",
        };
      },
      mapStateToProps: ["schemes", "selectedRegion"],
    },
    {
      widgetName: "regionStatistics",
      widgetFunc: (props: any) => {
        return {
          props,
          type: "regionStatistics",
        };
      },
      mapStateToProps: ["regions", "regionSummary"],
    },
    {
      widgetName: "mapView",
      widgetFunc: (props: any) => {
        return {
          props,
          type: "mapView",
        };
      },
      mapStateToProps: ["regions", "selectedRegion"],
    },
    {
      widgetName: "welcomeOptions",
      widgetFunc: (props: any) => {
        return {
          props,
          type: "welcomeOptions",
        };
      },
      mapStateToProps: [],
    },
    {
      widgetName: "schemeAnalysisOptions",
      widgetFunc: (props: any) => {
        return {
          props,
          type: "schemeAnalysisOptions",
        };
      },
      mapStateToProps: ["schemeAnalysis"],
    },
    {
      widgetName: "fullyCompletedSchemes",
      widgetFunc: (props: any) => {
        return {
          props,
          type: "fullyCompletedSchemes",
        };
      },
      mapStateToProps: ["schemes", "selectedRegion"],
    },
    {
      widgetName: "partialSchemes",
      widgetFunc: (props: any) => {
        return {
          props,
          type: "partialSchemes",
        };
      },
      mapStateToProps: ["schemes", "selectedRegion", "schemeType"],
    },
  ],
  state: {
    schemes: [],
    regions: [],
    regionSummary: null,
    selectedRegion: "all",
    schemeAnalysis: null,
    schemeType: "partial",
  },
};

export default config;
