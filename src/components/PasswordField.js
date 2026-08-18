import { useState } from 'react';

function PasswordField({ value, onChange, placeholder = '', required = false, name = 'password', autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="PasswordField">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        name={name}
        autoComplete={autoComplete}
      />
      <button
        className="PasswordToggle"
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12c2.2-4 5.7-6 10-6s7.8 2 10 6c-2.2 4-5.7 6-10 6S4.2 16 2 12Z" />
          <circle cx="12" cy="12" r="3.2" />
          {visible ? null : <path d="M4 4 20 20" />}
        </svg>
      </button>
    </div>
  );
}

export default PasswordField;
