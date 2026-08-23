import React from 'react';
import { Container } from 'react-bootstrap';

export function FooterSimple() {
  return (
    <div id="footer-simple">
      A project of{' '}
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://meemunnamu.org"
      >
        Meemunnamu Welfare Society
      </a>
    </div>
  );
}

/**
 * Footer component
 * @param {bool} mobileOnly - only display on mobile devices, <768 px
 */
export default function Footer({ mobileOnly = false }) {
  return (
    <footer className={mobileOnly ? 'd-block d-md-none' : null}>
      <Container>
        <div>
          A project of{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://meemunnamu.org"
          >
            Meemunnamu Welfare Society
          </a>
        </div>
      </Container>
    </footer>
  );
}
