
import { forwardRef, type ChangeEvent, type InputHTMLAttributes, type ChangeEventHandler } from 'react';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    onCheckedChange?: (checked: boolean) => void;
    onChange?: ChangeEventHandler<HTMLInputElement>;
}


const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, onCheckedChange, onChange, ...props }, ref) => {
        const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
            if (onCheckedChange) {
                onCheckedChange(event.target.checked);
            }
            if (onChange) {
                onChange(event);
            }
        };
        
        return (
            <input
                type="checkbox"
                ref={ref}
                className={cn(
                    'h-4 w-4 shrink-0 rounded border-gray-300 text-amber-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                onChange={handleChange}
                {...props}
            />
        );
    },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
