/**
 * Branding Context
 * Provides institution branding (logo, colors, name) throughout the application
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import institutionService from '../services/institutionService';

const BrandingContext = createContext();

// Default EduComfort branding
const DEFAULT_BRANDING = {
    name: 'EduComfort',
    brand_name: 'EduComfort',
    logo_url: '/logo.jpg', // Updated to local asset
    primary_color: '#0050b3', // Deep Blue
    secondary_color: '#52c41a', // Green
    subdomain: 'educomfort',
};

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState(DEFAULT_BRANDING);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBranding = async () => {
        try {
            setLoading(true);
            setError(null);

            // Only fetch if user is logged in
            const token = localStorage.getItem('sp_token');
            if (!token) {
                setBranding(DEFAULT_BRANDING);
                setLoading(false);
                return;
            }

            const data = await institutionService.getCurrentInstitution();
            setBranding({
                name: data.name,
                brand_name: data.brand_name || data.name,
                logo_url: data.logo_url,
                primary_color: data.primary_color || '#1890ff',
                secondary_color: data.secondary_color || '#52c41a',
                subdomain: data.subdomain,
                contact_email: data.contact_email,
                contact_phone: data.contact_phone,
                description: data.description,
                subscription: data.subscription,
            });
        } catch (err) {
            console.error('Failed to fetch branding:', err);
            setError(err);
            // Use default branding on error
            setBranding(DEFAULT_BRANDING);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranding();
    }, []);

    const refreshBranding = () => {
        fetchBranding();
    };

    const value = {
        branding,
        loading,
        error,
        refreshBranding,
    };

    return (
        <BrandingContext.Provider value={value}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => {
    const context = useContext(BrandingContext);
    if (!context) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
};

export default BrandingContext;
