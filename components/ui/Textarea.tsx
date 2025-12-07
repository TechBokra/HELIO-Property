import { forwardRef, type TextareaHTMLAttributes } from 'react';

const textareaVariants =
    'w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-gray-900 placeholder-gray-500';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    // Add custom props here if needed
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
    const classes = [textareaVariants, className].join(' ');
    return <textarea className={classes} ref={ref} {...props} />;
});

Textarea.displayName = 'Textarea';