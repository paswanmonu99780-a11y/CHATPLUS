import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayClient: Razorpay | null = null;
function getRazorpay() {
  if (!razorpayClient) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Payments will not work.');
      return null;
    }
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return razorpayClient;
}

// In-memory user storage
const users: any[] = [];
const currentUser: any = null; // Simple session simulation for demo

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // 1. RAZORPAY ORDER CREATION
  app.post("/api/create-order", async (req, res) => {
    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(500).json({ error: "Razorpay is not configured on this server." });
    }

    const { planName, price, currency = 'INR' } = req.body;
    
    // Clean price string like '₹199' to numeric 199
    const amount = parseInt(String(price).replace(/[^0-9]/g, '')) * 100; // Razorpay expects paise

    try {
      const options = {
        amount: amount,
        currency: currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
          planName: planName
        }
      };

      const order = await razorpay.orders.create(options);
      res.json({ 
        orderId: order.id, 
        amount: order.amount, 
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      });
    } catch (error: any) {
      console.error('[Razorpay Order Error]', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 1.1 RAZORPAY VERIFICATION
  app.post("/api/verify-payment", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_secret) {
      return res.status(500).json({ error: "Razorpay secret key missing" });
    }

    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      res.json({ status: 'success', message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ status: 'failure', message: 'Invalid signature' });
    }
  });

  // 2. TEST ROUTE
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 3. AUTH SYSTEM
  app.post("/api/auth/signup", (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const newUser = { 
      id: Date.now(), 
      email, 
      password, 
      credits: 100, 
      history: [] 
    };
    users.push(newUser);
    
    console.log(`[Auth] New user signed up: ${email}`);
    res.json({ message: "Signup successful", user: { id: newUser.id, email: newUser.email, credits: newUser.credits } });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log(`[Auth] User logged in: ${email}`);
    res.json({ 
      message: "Login successful", 
      user: { 
        id: user.id, 
        email: user.email, 
        credits: user.credits || 100,
        history: user.history || []
      } 
    });
  });

  app.get("/api/auth/me", (req, res) => {
    // In a real app, this would use JWT or sessions. 
    // For this beginner-friendly task, we return a mock state or null.
    res.json({ user: users.length > 0 ? { id: users[0].id, email: users[0].email } : null });
  });

  // 4. ERROR HANDLING
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Error] ${err.stack}`);
    res.status(500).json({ error: "Internal server error" });
  });

  // 5. VITE MIDDLEWARE INTEGRATION
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartAI Pro Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
