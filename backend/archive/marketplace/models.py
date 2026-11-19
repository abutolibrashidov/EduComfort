"""
Marketplace Domain — Models

Isolated marketplace that does NOT depend on:
  - User.xp or gamification data
  - InstitutionSubscription
  - Group or classroom logic

Three tables:
    marketplace_listings    — what's for sale (courses, books, workbooks, etc.)
    marketplace_orders      — every purchase transaction
    marketplace_commissions — platform cut recorded per completed order
"""
from decimal import Decimal

from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, Numeric,
    Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class MarketplaceListing(Base):
    """
    A single saleable item in the marketplace.

    scope values:
        'public'      — visible and purchasable by ALL authenticated users
        'institution' — purchasable only by users belonging to institution_id
        'individual'  — purchasable only by individual learner users

    listing_type values:
        'online_course', 'book', 'workbook', 'ielts_pack', 'bundle'
    """
    __tablename__ = "marketplace_listings"

    id              = Column(Integer, primary_key=True, index=True)

    # What type of content this listing represents
    listing_type    = Column(String(30), nullable=False)

    # Display info
    title           = Column(String(255), nullable=False)
    description     = Column(Text, nullable=True)
    thumbnail_url   = Column(String(500), nullable=True)

    # Pricing
    price           = Column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    currency        = Column(String(10), nullable=False, default="UZS")
    is_free         = Column(Boolean, nullable=False, default=False)

    # Audience scoping
    scope           = Column(String(20), nullable=False, default="public")
    institution_id  = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )  # NULL → globally available; set → institution-private listing

    # Seller
    seller_id       = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )  # Teacher or institution admin who created the listing

    # Linked content (soft FK — not enforced at DB level for polymorphism)
    resource_type   = Column(String(30), nullable=True)   # 'online_course', 'book', etc.
    resource_id     = Column(Integer, nullable=True)       # PK of the linked resource

    is_active       = Column(Boolean, nullable=False, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (read-only, domain-safe)
    institution     = relationship("Institution", foreign_keys=[institution_id])
    seller          = relationship("User", foreign_keys=[seller_id])
    orders          = relationship("MarketplaceOrder", back_populates="listing")

    __table_args__ = (
        Index("idx_marketplace_listings_scope_active", "scope", "is_active"),
        Index("idx_marketplace_listings_institution", "institution_id", "is_active"),
    )

    def __repr__(self):
        return f"<MarketplaceListing [{self.listing_type}] '{self.title}' scope={self.scope}>"


class MarketplaceOrder(Base):
    """
    A completed (or pending) purchase of a marketplace listing.

    status values:
        'pending'   — payment initiated
        'completed' — payment confirmed via gateway webhook
        'failed'    — payment failed or gateway error
        'refunded'  — order reversed

    payment_method values:
        'click', 'uzum', 'cash', 'card', 'free'
    """
    __tablename__ = "marketplace_orders"

    id              = Column(BigInteger, primary_key=True, index=True)
    listing_id      = Column(Integer, ForeignKey("marketplace_listings.id", ondelete="RESTRICT"), nullable=False, index=True)
    buyer_id        = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Institution context (NULL for individual learner buyers)
    institution_id  = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True)

    # Financial details (snapshot at time of purchase — immutable record)
    amount          = Column(Numeric(10, 2), nullable=False)
    currency        = Column(String(10), nullable=False, default="UZS")

    # Status & payment
    status          = Column(String(20), nullable=False, default="pending", index=True)
    payment_method  = Column(String(30), nullable=True)
    gateway_ref     = Column(String(255), nullable=True)  # Click / Uzum transaction ID

    purchased_at    = Column(DateTime(timezone=True), nullable=True)  # set when status → completed
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    listing         = relationship("MarketplaceListing", back_populates="orders")
    buyer           = relationship("User", foreign_keys=[buyer_id])
    commission      = relationship("MarketplaceCommission", back_populates="order", uselist=False)

    __table_args__ = (
        Index("idx_marketplace_orders_buyer", "buyer_id", "status"),
        Index("idx_marketplace_orders_institution", "institution_id", "status"),
    )

    def __repr__(self):
        return f"<MarketplaceOrder #{self.id} listing={self.listing_id} status={self.status}>"


class MarketplaceCommission(Base):
    """
    Platform commission record for each completed marketplace order.
    Created atomically when an order transitions to 'completed'.

    Provides a clean audit trail for:
        - How much each seller/institution earned
        - How much the platform took as commission
        - Settlement status (settled = paid out to seller)
    """
    __tablename__ = "marketplace_commissions"

    id                  = Column(BigInteger, primary_key=True, index=True)
    order_id            = Column(BigInteger, ForeignKey("marketplace_orders.id", ondelete="RESTRICT"), nullable=False, unique=True)
    seller_id           = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    institution_id      = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True)

    # Financial snapshot (immutable after creation)
    gross_amount        = Column(Numeric(10, 2), nullable=False)    # full order amount
    commission_rate     = Column(Numeric(5, 4), nullable=False)     # e.g. 0.1000 = 10%
    commission_amount   = Column(Numeric(10, 2), nullable=False)    # platform earns this
    net_amount          = Column(Numeric(10, 2), nullable=False)    # seller receives this

    # Settlement
    settled             = Column(Boolean, nullable=False, default=False)
    settled_at          = Column(DateTime(timezone=True), nullable=True)

    created_at          = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order               = relationship("MarketplaceOrder", back_populates="commission")
    seller              = relationship("User", foreign_keys=[seller_id])

    __table_args__ = (
        Index("idx_marketplace_commissions_seller", "seller_id", "settled"),
        Index("idx_marketplace_commissions_institution", "institution_id", "settled"),
    )

    def __repr__(self):
        return (
            f"<MarketplaceCommission order={self.order_id} "
            f"net={self.net_amount} commission={self.commission_amount} settled={self.settled}>"
        )
