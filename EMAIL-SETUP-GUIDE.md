# Email Service Setup Guide for VS Code

## Prerequisites
Before you can use the email functionality in VS Code, you need:
1. **SendGrid Account** with verified sender authentication
2. **SendGrid API Key** with email sending permissions
3. **Node.js** and **npm** installed on your system

## Step 1: Environment Variables Setup

Create a `.env` file in your project root directory and add your SendGrid API key:

```bash
# Copy from .env.example
cp .env.example .env
```

Edit the `.env` file and add your SendGrid API key:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Database Configuration  
DATABASE_URL=your_postgresql_connection_string

# Other environment variables...
```

## Step 2: SendGrid API Key

1. **Log into SendGrid Dashboard**
2. **Go to Settings → API Keys**
3. **Create New API Key** with "Mail Send" permissions
4. **Copy the API key** and paste it in your `.env` file

## Step 3: Sender Authentication

Verify your sender email in SendGrid:

1. **Go to Settings → Sender Authentication**
2. **Click "Verify a Single Sender"**
3. **Enter your email address** (e.g., rushikeshsalunkhe33@gmail.com)
4. **Fill in required details** and submit
5. **Check your email** for verification link
6. **Click verification link** to activate

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Start the Application

```bash
npm run dev
```

## Email Functions Usage

The email service is automatically imported in the helpdesk routes. Here's how it works:

### Automatic Email Triggers

**Ticket Creation Email:**
- Triggered when user submits a new helpdesk ticket
- Sends confirmation email to the user's email address
- Includes ticket ID, title, and description

**Ticket Resolution Email:**
- Triggered when admin resolves a ticket
- Sends notification to user with resolution details
- Includes admin comments and resolution notes

### Manual Email Testing

You can test the email service manually:

```javascript
import { sendTicketCreatedEmail, sendTicketResolvedEmail } from './server/services/email-service.js';

// Test ticket creation email
await sendTicketCreatedEmail(
  'user@example.com',
  'HD-000001', 
  'Test Issue',
  'This is a test ticket description'
);

// Test ticket resolution email  
await sendTicketResolvedEmail(
  'user@example.com',
  'HD-000001',
  'Test Issue', 
  'Issue has been resolved by updating system settings'
);
```

## Email Service File Locations

- **Email Service:** `server/services/email-service.ts`
- **Helpdesk Routes:** `server/routes/helpdesk-routes.ts`
- **Email Templates:** Defined in `email-service.ts`

## Troubleshooting

### Common Issues:

**1. "SendGrid not configured" Warning**
- Check if `SENDGRID_API_KEY` is set in `.env` file
- Verify the API key is correct and has proper permissions

**2. "Forbidden" or 403 Error**
- Verify sender email in SendGrid dashboard
- Check API key permissions include "Mail Send"
- Ensure sender authentication is complete

**3. Emails Going to Spam**
- The templates are optimized to reduce spam filtering
- Consider setting up domain authentication in SendGrid
- Ask recipients to add your email to their contact list

**4. Environment Variables Not Loading**
- Make sure `.env` file is in the project root
- Restart the development server after changing `.env`
- Check for typos in variable names

### Testing Email Delivery

Create a simple test file `test-email.js`:

```javascript
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'your-email@example.com',
  from: {
    name: 'Maharashtra Water Support',
    email: 'rushikeshsalunkhe33@gmail.com'
  },
  subject: 'Test Email from VS Code',
  html: '<h2>Email service is working!</h2><p>Your SendGrid configuration is correct.</p>',
};

sgMail.send(msg)
  .then(() => console.log('✅ Test email sent successfully!'))
  .catch(error => console.error('❌ Error:', error.response?.body || error.message));
```

Run the test:
```bash
node test-email.js
```

## Production Deployment

When deploying to production:

1. **Use environment variables** for the SendGrid API key
2. **Never commit** the `.env` file to version control
3. **Set up domain authentication** for better deliverability
4. **Monitor email logs** in SendGrid dashboard
5. **Consider rate limiting** for high-volume applications

## Support

If you encounter issues:
1. Check SendGrid dashboard for delivery logs
2. Verify all environment variables are set correctly
3. Test with a simple email first before using complex templates
4. Review SendGrid documentation for advanced configuration

The email service will work automatically once properly configured - users will receive emails when they create tickets and when admins resolve them.