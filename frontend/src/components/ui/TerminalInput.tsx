import { forwardRef } from 'react';

const TerminalInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => (
    <input
      ref={ref}
      {...props}
      className={`bg-transparent border border-[var(--pip-primary)]/35 text-[var(--pip-primary)] font-[inherit] px-3 py-2 text-[13px] rounded w-full outline-none focus:border-[var(--pip-primary)] focus:shadow-[0_0_8px_var(--pip-primary)/30] transition-all ${props.className ?? ''}`}
    />
  ),
);

TerminalInput.displayName = 'TerminalInput';
export default TerminalInput;
