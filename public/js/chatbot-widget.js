const user = getCurrentUser();

const isCustomerPage =
  document.getElementById('chatbot-widget') !== null;

if (isCustomerPage && (!user || user.role !== 'customer')) {
  document.getElementById('chatbot-widget')?.remove();
}

// FAQ Knowledge Base
const FAQ_KNOWLEDGE = {
  pricing: {
    keywords: ['price', 'cost', 'how much', 'expensive', 'fee', 'charge'],
    response: `💰 **Pricing Information**

Our 3D cake customization service offers competitive pricing:
- **Basic Design**: $25 - Simple single-layer custom cake
- **Deluxe Design**: $45 - Multi-layer with premium toppings
- **Premium Design**: $75 - Complex 3D designs with specialty items

All prices include:
✓ Unlimited design edits
✓ 3D preview
✓ Professional baking & delivery
✓ Personal baker consultation

Special discounts available for bulk orders (5+ cakes). Contact us for details!`
  },
  howItWorks: {
    keywords: ['how do', 'work', 'process', 'steps', 'customize', 'design', 'create'],
    response: `🎨 **How Our 3D Cake Customizer Works**

1. **Browse Templates**: Choose from our library of cake styles
2. **Customize**: Use the editor to:
   - Add layers (up to 3)
   - Select flavors (Vanilla, Chocolate, Strawberry, Mocha, Lemon)
   - Add toppings (sprinkles, whipped cream, candles, chocolate chips)
   - Add custom text

3. **3D Preview**: See your design in 3D before ordering
4. **Save Design**: Save your creation
5. **Place Order**: Add to cart and proceed to checkout
6. **Baking**: Our baker will prepare your custom cake
7. **Pickup/Delivery**: Enjoy your personalized cake!

Need help? Use the editor's controls on the right panel.`
  },
  delivery: {
    keywords: ['delivery', 'pickup', 'ship', 'deliver', 'when', 'how long', 'time'],
    response: `🚚 **Delivery & Pickup Options**

**Standard Delivery**: 3-5 business days
- Local area only (within 15 miles)
- Free for orders over $50
- $8 delivery fee for smaller orders

**Express Delivery**: 1-2 business days
- $15 additional fee
- Weekend delivery available (+$10)

**Pickup**: Same-day or next-day available
- Pickup times: 10 AM - 6 PM
- Location: 123 Cake Studio Street

**Shipping**: Currently unavailable
- We're working on nationwide shipping!

Your order confirmation will show the exact delivery date.`
  },
  payment: {
    keywords: ['payment', 'pay', 'card', 'credit', 'invoice', 'refund', 'return'],
    response: `💳 **Payment & Refunds**

**Accepted Payment Methods**:
✓ Credit/Debit Cards (Visa, MasterCard, Amex)
✓ PayPal
✓ Apple Pay / Google Pay

**Refund Policy**:
- Full refund if cancelled 48 hours before pickup
- 50% refund if cancelled 24-48 hours before pickup
- No refunds within 24 hours of pickup (custom items)
- Quality issues? Full refund or remake at no cost!

**Invoicing**: Digital receipts sent via email automatically.

Questions about a specific payment? Contact our support team with your order number.`
  },
  flavors: {
    keywords: ['flavor', 'taste', 'ingredient', 'vegan', 'gluten', 'allergies', 'dietary'],
    response: `🍰 **Cake Flavors & Dietary Options**

**Available Flavors**:
- 🍦 **Vanilla**: Classic, creamy vanilla cake
- 🍫 **Chocolate**: Rich dark chocolate
- 🍓 **Strawberry**: Fresh strawberry with cream
- ☕ **Mocha**: Coffee + chocolate blend
- 🍋 **Lemon**: Bright, refreshing lemon

**Dietary Options** (Special Order):
✓ Vegan (plant-based) - $5 extra
✓ Gluten-free - $8 extra
✓ Sugar-free - $6 extra
✓ Nut-free - No extra charge
✓ Dairy-free - $7 extra

**Allergies**: We handle nuts, dairy, gluten in-house. Let us know your needs at checkout!`
  },
  toppings: {
    keywords: ['topping', 'sprinkle', 'cream', 'candle', 'decor', 'customize'],
    response: `✨ **Toppings & Decorations**

**Available Toppings** (Unlimited):
- 🌈 **Sprinkles**: Colorful, classic sprinkles
- 🍾 **Whipped Cream**: Fresh whipped cream topping
- 🕯️ **Candles**: Celebration candles (any number)
- 🍫 **Chocolate Chips**: Premium chocolate pieces
- ✍️ **Custom Text**: Personalized messages (up to 50 characters)

**How to Add**:
1. Select a topping from the menu
2. Click on your cake to place it
3. Add as many as you want (no limit!)
4. Use "Undo" to remove, "Clear All" to start over

Pro tip: Mix and match for unique designs!`
  },
  account: {
    keywords: ['account', 'login', 'sign up', 'profile', 'password', 'reset'],
    response: `👤 **Account & Login**

**Creating an Account**:
1. Click "Sign Up" at the top
2. Enter your name, email, password
3. Verify your email address
4. You're ready to customize!

**My Orders**: View all your past & current orders
**My Orders** → Check status anytime

**Forgot Password?**:
1. Click "Forgot Password" on login
2. Enter your email
3. Follow the reset link sent to you
4. Create a new password

**Need Help?** Contact support@cakestudio.com`
  },
  contact: {
    keywords: ['contact', 'support', 'help', 'phone', 'email', 'reach'],
    response: `📞 **Get in Touch**

**Contact Us**:
📧 Email: support@cakestudio.com
📱 Phone: 1-800-CAKE-247 (1-800-225-3247)
💬 Live Chat: Available Mon-Fri, 9 AM-6 PM EST
📍 Location: 123 Cake Studio Street, Kitchen City, KS 12345

**Response Times**:
- Email: Within 24 hours
- Phone: Same-day response during business hours
- Live Chat: Immediate when available

We're here to help! Don't hesitate to reach out. 🎂`
  },
  reportIssue: {
    keywords: ['report', 'issue', 'problem', 'bug', 'broken', 'error', 'complaint', 'wrong'],
    response: `📝 **How to Report an Issue**

We want to make things right! Here's how to report a problem:

**Quick Report (via Chat)**:
Just describe the issue below and we'll create a ticket for you. Include:
- What went wrong?
- When did it happen?
- Your order number (if applicable)
- Screenshots/photos if needed

**Detailed Report Form**:
1. Go to **"Help & Report"** in your profile menu
2. Select the affected order
3. Choose the issue category:
   - Quality Issue (taste, appearance, damage)
   - Design Problem (colors, dimensions, rendering)
   - Delivery/Pickup Issue (late, wrong address)
   - Payment Question (billing, charge)
   - Other

4. Describe in detail
5. Submit - Our team will review within 24 hours

**Resolution**:
✓ Quality issues → FREE remake or full refund
✓ Delivery issues → Redelivery or discount
✓ Design problems → Free adjustment or credit

**Note**: For immediate assistance, call us at 1-800-CAKE-247`
  },
  saveDesign: {
    keywords: ['save', 'save design', 'store', 'keep', 'backup', 'reuse'],
    response: `💾 **How to Save Your Cake Design**

**Saving a Design**:
1. Customize your cake in the editor
2. Click **"Save & Pay"** button (bottom right)
3. Enter a name for your design (e.g., "Birthday Cake 2024")
4. Click **"Save & Proceed to Payment"**
5. Your design is saved to your account!

**View Saved Designs**:
1. Go to **"My Orders"** in your profile
2. Scroll to "Saved Designs" section
3. All your designs are listed there
4. Click any design to edit or order it again

**Reuse a Design**:
1. Open a saved design
2. Click **"Edit"** to modify it
3. Or click **"Order Again"** for the same design
4. Perfect for repeating orders!

**Design Limits**:
- You can save unlimited designs
- Designs stored for 2 years
- Share designs with friends (coming soon!)`
  },
  editOrder: {
    keywords: ['edit', 'change', 'modify', 'update', 'alter', 'adjust'],
    response: `✏️ **How to Edit or Modify Your Order**

**Can I Edit My Order?**
It depends on the status:

✅ **Can Edit** (Pending/Paid):
- Contact us immediately with changes
- We can update before baking starts
- No extra cost for design changes

⚠️ **Limited Changes** (In Progress):
- Baking has started - changes may not be possible
- Call us ASAP: 1-800-CAKE-247
- Refund possible if major issue

❌ **Cannot Edit** (Completed/Ready):
- Order is prepared and ready
- Contact us for quality concerns
- Full refund available if dissatisfied

**How to Request Changes**:
1. Go to your order in "My Orders"
2. Click "Request Modification"
3. Describe what you'd like to change
4. Our team will respond within 2 hours

**Time Matters!**
- Submit changes as early as possible
- Same-day changes: within 4 hours of ordering
- Next-day changes: before 6 PM previous day`
  },
  cancelOrder: {
    keywords: ['cancel', 'refund', 'stop', 'abort', 'discontinue'],
    response: `❌ **How to Cancel Your Order**

**Cancellation Policy**:
- **48+ hours before pickup**: Full refund ✅
- **24-48 hours before**: 50% refund ⚠️
- **Less than 24 hours**: No refund ❌
- Already baked? No refund (too late!)

**How to Cancel**:
1. Go to **"My Orders"**
2. Find your order
3. Click **"Cancel Order"** (if available)
4. Confirm cancellation
5. Refund processed within 3-5 business days

**Alternative - Modification**:
If you want to change rather than cancel:
- Contact us before baking starts
- Design changes are FREE
- Can modify delivery date (if time allows)

**Cannot Cancel?**
- Order is already baking
- Already picked up
- Contact us immediately: support@cakestudio.com

**Note**: Non-refundable items (custom text, specialty ingredients) are clearly marked at checkout.`
  },
  templates: {
    keywords: ['template', 'design', 'example', 'presets', 'browse', 'choose'],
    response: `🎨 **About Our Templates**

**What are Templates?**
Pre-designed cake styles you can customize as your starting point. No design skills needed!

**How to Use Templates**:
1. Go to **"Browse Templates"** (main page)
2. Browse our collection:
   - Birthday cakes
   - Wedding cakes
   - Holiday specials
   - Seasonal designs
   - Anniversary cakes

3. Click a template you like
4. **"Customize Now"** to edit it
5. Change colors, flavors, text, toppings
6. Save & order!

**Template Features**:
✓ Fully customizable (colors, text, toppings)
✓ 3D preview before ordering
✓ Mix designs (combine multiple templates)
✓ Create entirely new design (blank slate)

**Tips**:
- Start with similar style to save time
- All templates support up to 3 layers
- Add unlimited toppings & decorations
- Save your version for future orders

**Can't Find What You Want?**
Create a custom design from scratch or chat with us about special requests! 🎂`
  },
  trackOrder: {
    keywords: ['track', 'status', 'where', 'location', 'progress', 'order'],
    response: `📍 **How to Track Your Order**

**Real-Time Status Updates**:
1. Go to **"My Orders"** in your profile
2. Click on your order
3. See live status:
   - ⏳ **Pending**: Awaiting payment
   - 💳 **Paid**: Approved, baker starting soon
   - 🎂 **In Progress**: Being baked & decorated
   - ✅ **Ready**: Pick up or delivery scheduled
   - 🚚 **Out for Delivery**: On its way (if delivery)

**More Details**:
- Expected completion time
- Pickup/delivery date & time
- Baker notes
- Design confirmation

**Order Timeline**:
- **Pending**: 0-2 hours (waiting for payment)
- **Paid**: 2-4 hours (baker reviews design)
- **In Progress**: 24-48 hours (baking & decorating)
- **Ready**: 3-5 days (standard) or 1-2 days (express)

**Get Notifications**:
✓ Email updates at each stage
✓ SMS alerts (opt-in)
✓ In-app notifications

**Questions About Your Order?**
Chat with us or call: 1-800-CAKE-247`
  },
  bulkOrders: {
    keywords: ['bulk', 'quantity', 'multiple', 'wholesale', 'group', 'event', 'corporate'],
    response: `📦 **Bulk & Group Orders**

**Perfect For**:
- Weddings (multiple designs)
- Corporate events
- School fundraisers
- Party celebrations
- Business gifting

**Bulk Order Benefits**:
✓ Special pricing (5+ cakes)
- 5 cakes: 10% discount
- 10 cakes: 15% discount
- 20+ cakes: 20% discount + custom quote

✓ Dedicated support
✓ Custom requirements
✓ Flexible delivery schedule
✓ Payment plans available

**How to Order in Bulk**:
1. Contact our Bulk Order Team
2. Email: bulk@cakestudio.com
3. Or call: 1-800-CAKE-247 ext. 5
4. Provide:
   - Quantity needed
   - Event date & location
   - Design preferences
   - Special requirements

5. Get custom quote within 2 hours
6. Confirm & schedule delivery

**Timeline**: Bulk orders need 7-14 days notice for best pricing

**Customization**:
- Each cake can be unique
- Matching theme or individual designs
- Custom flavors & dietary options
- Corporate logos/branding available`
  },
  editor: {
    keywords: ['editor', 'customize', 'tool', 'controls', 'use editor', 'interface'],
    response: `🎯 **How to Use the 3D Cake Editor**

**Getting Started**:
1. Choose a template or create custom
2. Click **"Edit Design"** to open editor
3. Your cake appears in 3D on the left

**Left Panel - 3D Cake View**:
- Rotate: Click & drag to spin
- Zoom: Scroll to zoom in/out
- View all angles before ordering

**Right Panel - Editor Controls**:

**Layers Menu**:
- Layer 1, 2, 3 buttons
- Click to select which layer
- Add/Remove layers
- Each layer = new flavor option

**Flavors**:
- Select taste for each layer
- 5 options: Vanilla, Chocolate, Strawberry, Mocha, Lemon
- Mix different flavors!

**Toppings**:
- Select decoration
- Click cake to place
- Add unlimited toppings
- Undo/Clear buttons

**Custom Text**:
- Type message (up to 50 characters)
- Click "Add Text" 
- Appears on cake

**Tips**:
- Always preview in 3D
- Layer different flavors
- Mix toppings for unique look
- Save frequently
- Undo button = fix mistakes

Questions? Chat with us! 💬`
  },
  giftCards: {
    keywords: ['gift', 'card', 'certificate', 'voucher', 'present'],
    response: `🎁 **Cake Studio Gift Cards**

**Perfect Gift Option**:
Let your loved ones create their own custom cake!

**Available Denominations**:
- $25 (Basic Design)
- $50 (Deluxe Design)
- $75 (Premium Design)
- Custom amount ($10-$500)

**How to Give**:
1. Email address delivery (instant!)
2. Physical card in mail (3-5 days)
3. Custom message included

**How Recipients Use**:
1. Create account on Cake Studio
2. Design their perfect cake
3. Checkout and apply gift card
4. Remaining balance saved for later

**Features**:
✓ No expiration date
✓ Valid for any cake
✓ Can combine multiple cards
✓ Transferable to others
✓ Digital or physical delivery

**Buy Gift Cards**:
1. Click **"Gift Cards"** (top menu)
2. Choose amount & delivery method
3. Add message
4. Checkout
5. Recipient gets card instantly (or by mail)

**Balance Check**:
- Check balance at checkout
- Current balance shown in account
- Use across multiple orders

**Can't find gift option?** Email: support@cakestudio.com`
  }
};

// Chat state
let chatHistory = [];

const toggle = document.getElementById('chatbot-toggle');
const box = document.getElementById('chatbot-box');
const messagesContainer = document.getElementById('chat-messages');
const inputField = document.getElementById('chat-input');
const sendBtn = document.getElementById('chat-send');

// Initialize chatbot
function initializeChatbot() {
  if (toggle) {
    toggle.onclick = () => {
      box.classList.toggle('hidden');
      if (!box.classList.contains('hidden')) {
        showWelcomeMessage();
      }
    };
  }

  if (sendBtn) {
    sendBtn.onclick = sendMessage;
    inputField?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
}

function showWelcomeMessage() {
  if (chatHistory.length === 0) {
    addBotMessage(`👋 Welcome to Cake Studio Support!

I'm here to help! Ask me about:

📌 **Getting Started**
- How the customizer works
- Browse templates

💰 **Pricing & Payment**
- Pricing information
- Payment methods & refunds

🎨 **Customization**
- How to use the editor
- Toppings & decorations
- Flavors & dietary options

🚚 **Orders & Delivery**
- Track your order
- Delivery & pickup options
- Edit or cancel orders

🎁 **Special Services**
- Bulk & group orders
- Gift cards
- Save & reuse designs

📝 **Support**
- How to report an issue
- Contact support

Just ask me anything! If I don't know, I'll create a support ticket. 😊`);
  }
}

function addBotMessage(text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message bot-message';
  msgDiv.innerHTML = `<div class="message-content">${text}</div>`;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addUserMessage(text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message user-message';
  msgDiv.innerHTML = `<div class="message-content">${text}</div>`;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Fuzzy string matching - calculates similarity between two strings
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Check exact substring match first (highest priority)
  if (s1.includes(s2) || s2.includes(s1)) return 1.0;
  
  // Levenshtein distance based similarity
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = getLevenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

// Calculate Levenshtein distance (how many edits to transform one string to another)
function getLevenshteinDistance(s1, s2) {
  const matrix = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(0)
  );

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let i = 0; i <= s2.length; i++) matrix[i][0] = i;

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      const cost = s1[j - 1] === s2[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[s2.length][s1.length];
}

// Smart FAQ response finder with fuzzy matching
function findFAQResponse(userInput) {
  const lowerInput = userInput.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  let bestCategory = null;

  // Score each FAQ category
  for (const [category, faq] of Object.entries(FAQ_KNOWLEDGE)) {
    // Check each keyword in the FAQ
    for (const keyword of faq.keywords) {
      const similarity = calculateSimilarity(lowerInput, keyword);
      
      // Boost score for exact keyword matches
      let score = similarity;
      if (lowerInput.includes(keyword)) {
        score = Math.min(1.0, similarity + 0.3);
      }
      
      // Track best match
      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestMatch = faq.response;
        bestCategory = category;
      }
    }
  }

  // Return best match if found with good confidence
  return bestMatch ? { response: bestMatch, category: bestCategory, score: bestScore } : null;
}

// Extract intent from user message
function extractIntentAndContext(userInput) {
  const lowerInput = userInput.toLowerCase();
  
  // Detect question type
  const isQuestion = userInput.trim().endsWith('?');
  const isUrgent = /urgent|asap|help|emergency|please/.test(lowerInput);
  
  // Extract entities (numbers, currency, etc)
  const priceMatch = userInput.match(/\$?\d+(\.\d{2})?/g);
  const hasNegative = /can't|couldn't|not|no|don't|didn't|issue|problem|broken|error/.test(lowerInput);
  
  return {
    isQuestion,
    isUrgent,
    hasNegative,
    prices: priceMatch,
    length: userInput.length
  };
}

async function sendMessage() {
  const message = inputField.value.trim();

  if (!message) return;

  // Add user message to UI
  addUserMessage(message);
  inputField.value = '';
  chatHistory.push({ role: 'user', content: message });

  // Show typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message bot-message typing-indicator';
  typingDiv.innerHTML = '<div class="message-content">🤔 Thinking...</div>';
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Simulate slight delay for natural feel
  await new Promise(resolve => setTimeout(resolve, 500));

  // Extract context from user input
  const context = extractIntentAndContext(message);
  
  // Find best FAQ match
  const faqMatch = findFAQResponse(message);

  // Remove typing indicator
  typingDiv.remove();

  if (faqMatch && faqMatch.score >= 0.65) {
    // Strong FAQ match found
    const response = faqMatch.response;
    addBotMessage(response);
    chatHistory.push({ role: 'bot', content: response });
    
    // Add follow-up suggestion if message is short
    if (message.length < 30) {
      setTimeout(() => {
        addBotMessage(`Is there anything else you'd like to know about our service? 😊`);
      }, 1500);
    }
  } else if (faqMatch && faqMatch.score >= 0.5) {
    // Partial match - ask for clarification
    const clarification = `I'm not entirely sure about that. Did you mean something related to **${faqMatch.category.replace(/([A-Z])/g, ' $1').trim()}**? 

Feel free to rephrase or ask about:
- Pricing & Packages
- How customization works
- Delivery options
- Payment & Refunds
- Available flavors & toppings`;
    
    addBotMessage(clarification);
    
    // Try to submit as ticket anyway for team review
    submitSupportTicket(message);
  } else {
    // No FAQ match - escalate to support
    addBotMessage(`I couldn't find an answer to that in my knowledge base. Let me create a support ticket for you.

📝 **Submitting to Support Team...**`);

    await submitSupportTicket(message);
  }
}

async function submitSupportTicket(message) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const designId = urlParams.get('viewDesign') || null;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ message, designId })
    });

    if (res.ok) {
      addBotMessage(`✅ **Support Ticket Created!**

Your question has been sent to our support team. We'll get back to you within 24 hours.

In the meantime, feel free to ask me about:
- 💰 Pricing & Packages
- 🎨 How customization works
- 🚚 Delivery options
- 💳 Payment & Refunds
- 🍰 Flavors & Toppings`);
      chatHistory.push({
        role: 'bot',
        content: '✅ Support ticket created. Our team will respond within 24 hours.'
      });
    } else {
      addBotMessage('⚠️ Couldn\'t create ticket. Please try again or contact support@cakestudio.com directly.');
    }
  } catch (error) {
    console.error('Error submitting ticket:', error);
    addBotMessage('❌ Error submitting message. Please try again or contact us directly.');
  }
}

// Initialize on page load
initializeChatbot();