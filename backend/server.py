from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import os
import stripe
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Canupls API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY

# ─── Pydantic Models ────────────────────────────────────────────

class CreateCustomerRequest(BaseModel):
    email: str
    name: str
    user_id: str

class SetupIntentRequest(BaseModel):
    customer_id: str

class PaymentIntentRequest(BaseModel):
    customer_id: str
    amount: int  # in cents
    payment_method_id: Optional[str] = None
    metadata: Optional[dict] = None

class DeletePaymentMethodRequest(BaseModel):
    payment_method_id: str

# ─── Health & Config ────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "Canupls API - Hyperlocal Help Marketplace",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_ANON_KEY),
        "stripe_configured": bool(STRIPE_SECRET_KEY),
        "maps_configured": bool(GOOGLE_MAPS_API_KEY)
    }

@app.get("/api/config")
async def get_config():
    return {
        "supabase_url": SUPABASE_URL,
        "google_maps_api_key": GOOGLE_MAPS_API_KEY,
        "features": {
            "payments": True,
            "real_time_tracking": True,
            "ratings": True
        }
    }

# ─── Stripe: Customer Management ────────────────────────────────

@app.post("/api/stripe/customer")
async def create_stripe_customer(req: CreateCustomerRequest):
    """Create a Stripe customer for a Canupls user"""
    try:
        customer = stripe.Customer.create(
            email=req.email,
            name=req.name,
            metadata={"canupls_user_id": req.user_id}
        )
        return {"customer_id": customer.id, "email": customer.email}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─── Stripe: Setup Intent (for saving payment methods) ──────────

@app.post("/api/stripe/setup-intent")
async def create_setup_intent(req: SetupIntentRequest):
    """Create a SetupIntent so the user can save a payment method"""
    try:
        intent = stripe.SetupIntent.create(
            customer=req.customer_id,
            payment_method_types=["card"],
        )
        return {
            "setup_intent_id": intent.id,
            "client_secret": intent.client_secret,
        }
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─── Stripe: Payment Methods ────────────────────────────────────

@app.get("/api/stripe/payment-methods/{customer_id}")
async def list_payment_methods(customer_id: str):
    """List all saved payment methods for a customer"""
    try:
        methods = stripe.PaymentMethod.list(
            customer=customer_id,
            type="card",
        )
        cards = []
        for pm in methods.data:
            cards.append({
                "id": pm.id,
                "brand": pm.card.brand,
                "last4": pm.card.last4,
                "exp_month": pm.card.exp_month,
                "exp_year": pm.card.exp_year,
            })
        return {"payment_methods": cards}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/stripe/payment-method/{payment_method_id}")
async def delete_payment_method(payment_method_id: str):
    """Detach a payment method from a customer"""
    try:
        stripe.PaymentMethod.detach(payment_method_id)
        return {"status": "deleted", "payment_method_id": payment_method_id}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─── Stripe: Payment Intent (charge for a task) ─────────────────

@app.post("/api/stripe/payment-intent")
async def create_payment_intent(req: PaymentIntentRequest):
    """Create a PaymentIntent for a task payment"""
    try:
        params = {
            "amount": req.amount,
            "currency": "usd",
            "customer": req.customer_id,
            "metadata": req.metadata or {},
        }
        if req.payment_method_id:
            params["payment_method"] = req.payment_method_id
            params["confirm"] = True
            params["return_url"] = "canupls://payment-complete"

        intent = stripe.PaymentIntent.create(**params)
        return {
            "payment_intent_id": intent.id,
            "client_secret": intent.client_secret,
            "status": intent.status,
        }
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─── Stripe: Webhook ────────────────────────────────────────────

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        event = stripe.Event.construct_from(
            stripe.util.convert_to_dict(
                stripe.util.json.loads(body)
            ),
            stripe.api_key,
        )
        return {"status": "received", "type": event.type}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
