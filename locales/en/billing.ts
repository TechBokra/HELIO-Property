
export const billing = {
    "subscriptionPlans": {
        "title": "Subscription Plans",
        "selectButton": "Select Plan",
        "developer": {
            "basic": { "name": "Basic", "price": "Free", "description": "For new developers, start with one project.", "features": ["1 Project", "10 Units", "Basic Dashboard"] },
            "professional": { "name": "Professional", "price": "5,000 EGP/mo", "description": "For growing developers, showcase more.", "features": ["5 Projects", "50 Units", "Advanced Analytics", "Tech Support"] },
            "elite": { "name": "Elite", "price": "15,000 EGP/mo", "description": "For major developers, unlimited access.", "features": ["Unlimited Projects", "Unlimited Units", "Priority Display", "Dedicated Account Manager"] }
        },
        "agency": {
            "basic": { "name": "Basic", "price": "Free", "description": "For small agencies.", "features": ["3 Properties", "Basic Dashboard"] },
            "professional": { "name": "Professional", "price": "2,000 EGP/mo", "description": "For active agencies.", "features": ["15 Properties", "Featured Listing", "Analytics"] },
            "elite": { "name": "Elite", "price": "5,000 EGP/mo", "description": "For large agencies.", "features": ["Unlimited Properties", "Top of List", "24/7 Support"] }
        },
        "finishing": {
            "commission": { "name": "Commission", "price": "Free", "description": "Pay only when you get a job.", "features": ["Profile", "Receive Requests", "10% Commission"] },
            "professional": { "name": "Professional", "price": "3,000 EGP/mo", "description": "For professional companies.", "features": ["Portfolio", "No Commission", "Priority Visibility"] },
            "elite": { "name": "Elite", "price": "8,000 EGP/mo", "description": "For major companies.", "features": ["Unlimited Portfolio", "Trusted Partner Badge", "Exclusive Promotion"] }
        },
        "individual": {
            "sale": {
                "paid_listing": { "name": "Paid Listing", "price": "500 EGP", "description": "One-time fee to list your property.", "features": ["Listed for 3 months", "Direct contact with buyers"] },
                "commission": { "name": "Commission", "price": "Free", "description": "We sell for you for a commission.", "features": ["We manage the process", "Professional photography", "2.5% Commission on sale"] }
            },
            "rent": {
                "paid_listing": { "name": "Paid Listing", "price": "300 EGP", "description": "List your unit for rent.", "features": ["Listed for 2 months", "Direct contact"] },
                "commission": { "name": "Commission", "price": "Free", "description": "We rent it for you.", "features": ["We manage the process", "1 Month Rent Commission"] }
            }
        }
    },
    "upgradePlanModal": {
        "title": "Upgrade Your Plan",
        "message": "You have reached the maximum limit allowed on your current plan. To access more features and add more items, please upgrade your subscription.",
        "upgradeButton": "Upgrade Now",
        "closeButton": "Cancel"
    },
    "favoritesPage": {
        "title": "My Favorites",
        "subtitle": "Here you can find all the properties and services you have saved.",
        "noFavorites": "You haven't saved any favorites yet.",
        "browseButton": "Browse Properties",
        "addToFavorites": "Add to Favorites",
        "removeFromFavorites": "Remove from Favorites",
        "addedToFavorites": "Added to favorites successfully!",
        "removedFromFavorites": "Removed from favorites."
    },
    "payment": {
        "title": "Complete Payment",
        "summary": "Order Summary",
        "total": "Total",
        "selectMethod": "Select Payment Method",
        "securePayment": "Secure Payment",
        "transferDetails": "Transfer Details",
        "uploadReceipt": "Upload Receipt",
        "confirmTransfer": "Confirm Transfer",
        "payNow": "Pay Now",
        "successTitle": "Payment Successful!",
        "reviewTitle": "Payment Submitted for Review",
        "successMessage": "Your payment was processed successfully and your request is confirmed.",
        "reviewMessage": "Receipt received. Our team will review the transaction and activate your request shortly.",
        "transactionId": "Transaction ID",
        "returnHome": "Return to Home"
    }
};
