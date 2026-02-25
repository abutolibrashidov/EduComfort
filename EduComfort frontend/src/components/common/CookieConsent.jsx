import React, { useState, useEffect } from 'react';
import { Button, Typography, Layout } from 'antd';

const { Text } = Typography;

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_consent', 'accepted');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            padding: '16px 24px',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 9999,
            flexWrap: 'wrap',
            gap: '16px'
        }}>
            <Text style={{ flex: 1, minWidth: '280px' }}>
                We use cookies to improve your experience, analyze traffic, and support essential platform functionality. By continuing to use the Platform, you agree to our Cookie Policy.
            </Text>
            <Button type="primary" onClick={handleAccept}>
                Accept Cookies
            </Button>
        </div>
    );
};

export default CookieConsent;
