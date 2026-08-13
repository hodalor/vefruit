function LoadingButton({
  loading = false,
  loadingText = 'Please wait...',
  className = 'Btn',
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      {...props}
      className={`${className} ${loading ? 'is-loading' : ''}`.trim()}
      disabled={disabled || loading}
    >
      {loading && <span className="BtnSpinner" aria-hidden="true" />}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}

export default LoadingButton;
