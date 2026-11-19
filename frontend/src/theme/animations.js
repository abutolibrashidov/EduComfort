// Animation Utilities for EduComfort
// Reusable Framer Motion variants and animation helpers

export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
};

export const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4, ease: 'easeOut' }
};

export const fadeInDown = {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.4, ease: 'easeOut' }
};

export const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.3, ease: 'easeOut' }
};

export const slideInLeft = {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
    transition: { duration: 0.4, ease: 'easeOut' }
};

export const slideInRight = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
    transition: { duration: 0.4, ease: 'easeOut' }
};

// Stagger Children Animation
export const staggerContainer = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export const staggerItem = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
};

// Hover Animations
export const hoverScale = {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: { type: 'spring', stiffness: 300 }
};

export const hoverLift = {
    whileHover: { y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' },
    transition: { duration: 0.3 }
};

export const hoverGlow = {
    whileHover: {
        boxShadow: '0 0 30px rgba(0, 97, 242, 0.5)',
        scale: 1.02
    },
    transition: { duration: 0.3 }
};

// Pulse Animation
export const pulse = {
    animate: {
        scale: [1, 1.05, 1],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
        }
    }
};

// Bounce Animation
export const bounce = {
    animate: {
        y: [0, -10, 0],
        transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut'
        }
    }
};

// Rotate Animation
export const rotate = {
    animate: {
        rotate: 360,
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'linear'
        }
    }
};

// Page Transition Variants
export const pageTransition = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3 }
};

// Modal Variants
export const modalBackdrop = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

export const modalContent = {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 },
    transition: { type: 'spring', damping: 25, stiffness: 300 }
};

// Card Flip Animation
export const cardFlip = {
    initial: { rotateY: 0 },
    animate: { rotateY: 180 },
    transition: { duration: 0.6 }
};

// Shake Animation (for errors)
export const shake = {
    animate: {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 }
    }
};

// Success Checkmark Animation
export const successCheck = {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 0.5, ease: 'easeOut' }
};

// Loading Spinner
export const spinner = {
    animate: {
        rotate: 360,
        transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
        }
    }
};

// Notification Slide In
export const notificationSlide = {
    initial: { x: 300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 300, opacity: 0 },
    transition: { type: 'spring', damping: 20, stiffness: 300 }
};

// Progress Bar Fill
export const progressFill = (progress) => ({
    initial: { width: '0%' },
    animate: { width: `${progress}%` },
    transition: { duration: 0.8, ease: 'easeOut' }
});

// Number Counter Animation
export const counterAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

// Export all animations
export default {
    fadeIn,
    fadeInUp,
    fadeInDown,
    scaleIn,
    slideInLeft,
    slideInRight,
    staggerContainer,
    staggerItem,
    hoverScale,
    hoverLift,
    hoverGlow,
    pulse,
    bounce,
    rotate,
    pageTransition,
    modalBackdrop,
    modalContent,
    cardFlip,
    shake,
    successCheck,
    spinner,
    notificationSlide,
    progressFill,
    counterAnimation,
};
