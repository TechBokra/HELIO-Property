import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

const buttonVariants = {
    base: 'inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:pointer-events-none',
    variants: {
        variant: {
            primary: 'bg-amber-500 text-gray-900 hover:bg-amber-600 shadow-sm',
            secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
            outline: 'border border-amber-500 text-amber-500 hover:bg-amber-50',
            ghost: 'hover:bg-gray-100',
            danger: 'bg-red-600 text-white hover:bg-red-700',
            success: 'bg-green-600 text-white hover:bg-green-700',
            link: 'text-amber-500 underline-offset-4 hover:underline',
        },
        size: {
            default: 'px-4 py-2',
            sm: 'h-9 px-3 rounded-md',
            lg: 'h-11 px-8 rounded-md text-lg',
            icon: 'h-10 w-10',
        },
    },
};

type ButtonVariant = keyof typeof buttonVariants.variants.variant;
type ButtonSize = keyof typeof buttonVariants.variants.size;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ 
    className, 
    variant = 'primary', 
    size = 'default', 
    isLoading, 
    type = 'button', 
    children, 
    disabled,
    ...props 
}, ref) => {
    const classes = [
        buttonVariants.base,
        buttonVariants.variants.variant[variant],
        buttonVariants.variants.size[size],
        className,
    ].join(' ');

    return (
        <button type={type} className={classes} ref={ref} disabled={isLoading || disabled} {...props}>
            {isLoading && <Spinner size="sm" className="mr-2" />}
            {children}
        </button>
    );
});

Button.displayName = 'Button';