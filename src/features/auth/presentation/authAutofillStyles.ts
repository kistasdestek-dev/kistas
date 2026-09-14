const AUTOFILL_STYLE_ID = 'kistas-auth-autofill-styles';

const AUTH_SCREEN_SELECTOR = '#kistas-auth-experience';

const AUTOFILL_STYLES = `
${AUTH_SCREEN_SELECTOR} input,
${AUTH_SCREEN_SELECTOR} input:focus,
${AUTH_SCREEN_SELECTOR} input:focus-visible {
  outline: none !important;
  border-color: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  -webkit-tap-highlight-color: transparent !important;
}
${AUTH_SCREEN_SELECTOR} input::selection {
  color: #252333 !important;
  background: rgba(50, 105, 199, 0.16) !important;
}
${AUTH_SCREEN_SELECTOR} input:-webkit-autofill,
${AUTH_SCREEN_SELECTOR} input:-webkit-autofill:hover,
${AUTH_SCREEN_SELECTOR} input:-webkit-autofill:focus,
${AUTH_SCREEN_SELECTOR} input:-webkit-autofill:active {
  -webkit-text-fill-color: #252333 !important;
  -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
  box-shadow: 0 0 0 1000px transparent inset !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  background-color: transparent !important;
  background-image: none !important;
  caret-color: #252333 !important;
  border-radius: 0 !important;
  transition: background-color 9999s ease-out 0s !important;
}
${AUTH_SCREEN_SELECTOR} input:autofill {
  color: #252333 !important;
  background-color: transparent !important;
  background-image: none !important;
}
`;

export const installAuthAutofillStyles = () => {
  if (typeof document === 'undefined') return;
  const style = document.getElementById(AUTOFILL_STYLE_ID) ?? document.createElement('style');
  style.id = AUTOFILL_STYLE_ID;
  style.textContent = AUTOFILL_STYLES;
  if (!style.parentNode) document.head.appendChild(style);
};
