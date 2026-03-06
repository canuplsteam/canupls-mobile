from fastapi import FastAPI, HTTPException, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime
import os
from dotenv import load_dotenv
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest
)

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
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Pydantic Models
class TaskCreate(BaseModel):
    title: str
    description: str
    category: str
    location_lat: float
    location_lng: float
    location_address: str
    price: float

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    helper_location_lat: Optional[float] = None
    helper_location_lng: Optional[float] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_available: Optional[bool] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None

class RatingCreate(BaseModel):
    task_id: str
    to_user_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class PaymentCheckoutRequest(BaseModel):
    task_id: str
    origin_url: str

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
        "stripe_configured": bool(STRIPE_API_KEY),
        "maps_configured": bool(GOOGLE_MAPS_API_KEY)
    }

# Configuration endpoint for mobile app
@app.get("/api/config")
async def get_config():
    """Get public configuration for mobile app"""
    return {
        "supabase_url": SUPABASE_URL,
        "supabase_anon_key": SUPABASE_ANON_KEY,
        "google_maps_api_key": GOOGLE_MAPS_API_KEY,
        "features": {
            "payments": True,
            "real_time_tracking": True,
            "ratings": True
        }
    }

# Payment Endpoints
@app.post("/api/payments/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: PaymentCheckoutRequest,
    http_request: Request
):
    """
    Create a Stripe checkout session for task payment
    Amount is determined by the task, not from frontend
    """
    try:
        # In production, you would fetch the task from Supabase to get the price
        # For now, we'll use a placeholder amount
        # TODO: Fetch actual task price from Supabase
        amount = 10.00  # Placeholder - should be fetched from task
        
        # Build success and cancel URLs from origin
        success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/payment-cancel"
        
        # Initialize Stripe Checkout
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "task_id": request.task_id,
                "source": "canupls_mobile"
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # TODO: Create payment_transactions record in Supabase with status="pending"
        
        return session
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/payments/status/{session_id}", response_model=CheckoutStatusResponse)
async def get_payment_status(session_id: str, http_request: Request):
    """
    Check the status of a payment session
    """
    try:
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # TODO: Update payment_transactions record in Supabase based on status
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhooks for payment events
    """
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # TODO: Handle different event types and update Supabase accordingly
        # webhook_response has: event_type, event_id, session_id, payment_status, metadata
        
        return {"status": "success", "event_type": webhook_response.event_type}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Nearby Tasks Endpoint (using simple distance calculation)
@app.get("/api/tasks/nearby")
async def get_nearby_tasks(
    lat: float,
    lng: float,
    radius_km: float = 10.0,
    user_id: Optional[str] = None
):
    """
    Get tasks near a location
    In production, this would query Supabase with PostGIS or calculate distance
    """
    # TODO: Implement actual Supabase query with distance calculation
    return {
        "tasks": [],
        "message": "Nearby tasks endpoint - integrate with Supabase"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
