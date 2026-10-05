import React from 'react';
import PropTypes from 'prop-types';
import { openSignIn } from '@/lib/openSignIn';

/**
 * Simple wrapper button for Clerk sign-in that routes the flow through
 * the `openSignIn` helper so embedded webviews open the system browser
 * or fall back to the /open-in-browser helper page.
 *
 * Usage:
 * <ClerkSignInButton className="...">Sign in</ClerkSignInButton>
 */
export default function ClerkSignInButton({ children, href = '/sign-in', className = '', ...props }) {
  const handleClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      openSignIn(href);
    } catch (err) {
      // best-effort fallback: navigate to the sign-in page
      window.location.assign(href);
    }
  };

  return (
    <button {...props} onClick={handleClick} className={className}>
      {children || 'Sign in'}
    </button>
  );
}

ClerkSignInButton.propTypes = {
  children: PropTypes.node,
  href: PropTypes.string,
  className: PropTypes.string,
};
