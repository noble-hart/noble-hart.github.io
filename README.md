# Noble Hart Standalone Website

This is the GitHub-ready standalone version of the Noble Hart website. It is a static HTML/CSS/JavaScript site and does not require a server.

## Pages
- `index.html` — long-form landing page
- `book.html` — My Story Writing Adventure detail page
- `freebies.html` — current free resources page
- `about.html` — founder / publisher page

## Navigation
Home · Explore · My Book · Free Resources · Contact Me · Newsletter · About

## EmailJS setup — required before publishing
The Contact Me and Newsletter forms are wired for EmailJS, but the IDs are intentionally left as placeholders. Do not publish until you replace them.

### 1. Create an EmailJS account and connect your email service
Connect the email account/service where you want Noble Hart messages delivered. EmailJS supports services such as Gmail and other providers.

### 2. Create the Contact template
Use a template with these variables:
- `{{title}}` — subject
- `{{name}}` — sender name
- `{{email}}` — sender email
- `{{message}}` — message
- `{{time}}` — submission time (optional; the form can be extended if desired)

Set **To Email** to your Noble Hart inbox and **Reply-To** to `{{email}}` so you can reply directly to the visitor.

### 3. Create the Newsletter template
Use these variables:
- `{{name}}` — subscriber first name
- `{{email}}` — subscriber email

For actual subscriber collection, enable **Save Contacts** in the template's Contacts tab. EmailJS can then create contacts automatically and lets you view/export them from its Contacts area.

### 4. Copy your IDs into `emailjs-config.js`
Replace:
```js
publicKey: "YOUR_PUBLIC_KEY",
serviceId: "YOUR_SERVICE_ID",
contactTemplateId: "YOUR_CONTACT_TEMPLATE_ID",
newsletterTemplateId: "YOUR_NEWSLETTER_TEMPLATE_ID"
```
with your real EmailJS values.

**Do not put an EmailJS Private Key in this file.** The browser integration uses the Public Key.

### 5. Test before launch
Test the contact form from a real browser and confirm the message arrives in the intended inbox. Test newsletter signup separately and confirm the contact appears in EmailJS if Save Contacts is enabled. Also check spam/junk folders.

## Current freebie download links
The Free Resources page contains the planned access area, but no invented PDF links have been added. Replace the placeholders with your real hosted files when the PDFs are ready.

## Recommended GitHub publishing
Upload the contents of this website folder to a GitHub repository and enable GitHub Pages. Because the site is static, no build command is required.

## Security / privacy notes
- Do not publish your private email address just to make the form work. EmailJS sends through the service/template configuration.
- The site does not publish your residential address or private phone number.
- Consider adding an EmailJS CAPTCHA/rate-limiting setup before significant public traffic.
- Keep the website truthful and current, especially the Founder/Publisher and NobleSPark Publishing information.
