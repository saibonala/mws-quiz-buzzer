import React from 'react';
import { Navbar } from 'react-bootstrap';
import { isNil } from 'lodash';
import { useHistory } from 'react-router';
import { leaveRoom } from '../lib/endpoints';

export default function Header({
  auth = {},
  clearAuth,
  sound = null,
  setSound,
}) {
  const history = useHistory();

  // leave current game
  async function leave() {
    try {
      await leaveRoom(auth.roomID, auth.playerID, auth.credentials);
      clearAuth();
      history.push('/');
    } catch (error) {
      console.log('leave error', error);
      clearAuth();
      history.push('/');
    }
  }

  return (
    <header>
      <Navbar>
        <Navbar.Brand className="brand-stacked">
          <img
            src="/mws-logo.png"
            alt="Meemunnamu Welfare Society"
            height="200"
          />
          <span>MWS Quiz Buzzer</span>
        </Navbar.Brand>
        <div className="nav-buttons">
          {!isNil(sound) ? (
            <button className="text-button" onClick={() => setSound()}>
              {sound ? 'Turn off sound' : 'Turn on sound'}
            </button>
          ) : null}
          {clearAuth ? (
            <button className="text-button" onClick={() => leave()}>
              Leave game
            </button>
          ) : null}
        </div>
      </Navbar>
    </header>
  );
}
