import React from 'react';

const spinnerVariants = {
    size: {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
    },
};

type SpinnerSize = keyof typeof spinnerVariants.size;

interface SpinnerProps {
    size?: SpinnerSize;
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
    const classes = ['animate-spin rounded-full border-b-2 border-current', spinnerVariants.size[size], className].join(
        ' ',
    );

    return <div className={classes} role="status" aria-label="Loading..."></div>;
};
