
import { forwardRef, type HTMLAttributes, type InputHTMLAttributes } from 'react';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

const RadioGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        return <div ref={ref} className={cn('grid gap-2', className)} role="radiogroup" {...props} />;
    },
);
RadioGroup.displayName = 'RadioGroup';

const RadioGroupItem = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => {
        return (
            <input
                type="radio"
                ref={ref}
                className={cn(
                    'h-4 w-4 text-amber-600 border-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                {...props}
            />
        );
    },
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
