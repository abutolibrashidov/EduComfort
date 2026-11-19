"""
Tenant Context Middleware
Automatically filters queries by institution_id for multi-tenant data isolation
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.security import decode_access_token


class TenantContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to extract institution_id from JWT token and add to request state
    This enables automatic tenant filtering in all database queries
    """
    
    async def dispatch(self, request: Request, call_next):
        print(f"[INFO] TenantContextMiddleware: Processing {request.method} {request.url.path}")
        
        # Skip middleware for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            print("[INFO] Skipping OPTIONS request")
            return await call_next(request)

        # Skip middleware for public endpoints and admin routes
        public_paths = [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/",
            "/auth",
            "/api/institutions/register",
            "/api/learners",
            "/public",
            "/admin",  # Allow all admin routes
            "/uploads",  # Static files
        ]
        
        # Check if current path should skip tenant filtering
        if any(request.url.path.startswith(path) for path in public_paths):
            print(f"[INFO] Public path: {request.url.path}")
            request.state.institution_id = None
            request.state.is_platform_admin = False
            response = await call_next(request)
            print(f"[INFO] Response sent for {request.url.path}")
            return response
        
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
            try:
                # Decode token to get institution_id
                payload = decode_access_token(token)
                
                if payload:
                    # Add tenant context to request state
                    request.state.institution_id = payload.get("institution_id")
                    request.state.is_platform_admin = payload.get("is_platform_admin", False)
                    
                    # Check for Platform Owner role
                    role = payload.get("role")
                    request.state.is_platform_owner = (role == "platform_owner")
                    
                    request.state.is_super_admin = payload.get("is_super_admin", False)
                    request.state.user_id = payload.get("user_id")
                    print(f"[INFO] Token decoded: user_id={request.state.user_id}, role={role}")
                else:
                    print("[WARN] Token decode failed (None payload)")
                    request.state.institution_id = None
                    request.state.is_platform_admin = False
                    request.state.is_platform_owner = False
                    request.state.is_super_admin = False
                
            except Exception as e:
                print(f"[WARN] Token decode error: {e}")
                # If token is invalid, set context to None
                # The auth dependency will handle the actual authentication error
                request.state.institution_id = None
                request.state.is_platform_admin = False
                request.state.is_platform_owner = False
                request.state.is_super_admin = False
        else:
            print("[INFO] No auth token provided")
            # No token provided
            request.state.institution_id = None
            request.state.is_platform_admin = False
            request.state.is_super_admin = False
        
        print("[INFO] Calling next middleware/handler...")
        response = await call_next(request)
        print(f"[INFO] Response ready for {request.url.path}")
        return response


def get_tenant_id(request: Request) -> int | None:
    """
    Helper function to get institution_id from request state
    Returns None if user is platform admin or super admin (can access all institutions)
    """
    if hasattr(request.state, "is_platform_owner") and request.state.is_platform_owner:
        return None  # Platform Owner bypasses ALL tenant filtering (God Mode)

    if hasattr(request.state, "is_platform_admin") and request.state.is_platform_admin:
        return None  # Platform admins bypass tenant filtering
    
    if hasattr(request.state, "is_super_admin") and request.state.is_super_admin:
        return None  # Super admins bypass tenant filtering
    
    return getattr(request.state, "institution_id", None)


def require_tenant_context(request: Request) -> int:
    """
    Helper function that requires institution_id to be present
    Raises HTTPException if not found
    """
    institution_id = getattr(request.state, "institution_id", None)
    
    if institution_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="TENANT_MW: Institution context required. Please ensure you are logged in with an institution account."
        )
    
    return institution_id
