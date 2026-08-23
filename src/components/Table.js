import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router';
import { get, some, values, sortBy, orderBy, isEmpty, round } from 'lodash';
import { Howl } from 'howler';
import { AiOutlineDisconnect } from 'react-icons/ai';
import { Container } from 'react-bootstrap';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { leaveRoom } from '../lib/endpoints';

export default function Table(game) {
  const history = useHistory();
  const [loaded, setLoaded] = useState(false);
  const [buzzed, setBuzzer] = useState(
    some(game.G.queue, (o) => o.id === game.playerID)
  );
  const [lastBuzz, setLastBuzz] = useState(null);
  const [sound, setSound] = useState(true);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [announced, setAnnounced] = useState(false);
  const buzzButton = useRef(null);
  const queueRef = useRef(null);
  const announceTimeoutRef = useRef(null);

  const buzzSound = new Howl({
    src: [
      `${process.env.PUBLIC_URL}/shortBuzz.webm`,
      `${process.env.PUBLIC_URL}/shortBuzz.mp3`,
    ],
    volume: 0.5,
    rate: 1.5,
  });

  const playSound = () => {
    if (sound && !soundPlayed) {
      buzzSound.play();
      setSoundPlayed(true);
    }
  };

  // announce the first player to buzz, a couple seconds after the buzz sound
  const announceFirstBuzzer = () => {
    if (!sound || announced) {
      return;
    }
    setAnnounced(true);

    const firstBuzz = get(sortBy(values(game.G.queue), ['timestamp']), '0');
    const player = (game.gameMetadata || []).find(
      (p) => String(p.id) === String(get(firstBuzz, 'id'))
    );
    if (!player || !window.speechSynthesis) {
      return;
    }

    announceTimeoutRef.current = setTimeout(() => {
      window.speechSynthesis.speak(
        new SpeechSynthesisUtterance(`${player.name} hit the buzzer first`)
      );
    }, 2000);
  };

  useEffect(() => {
    console.log(game.G.queue, Date.now());
    // reset buzzer based on game
    if (!game.G.queue[game.playerID]) {
      // delay the reset, in case game state hasn't reflected your buzz yet
      if (lastBuzz && Date.now() - lastBuzz < 500) {
        setTimeout(() => {
          const queue = queueRef.current;
          if (queue && !queue[game.playerID]) {
            setBuzzer(false);
          }
        }, 500);
      } else {
        // immediate reset, if it's been awhile
        setBuzzer(false);
      }
    }

    // reset ability to play sound if there is no pending buzzer
    if (isEmpty(game.G.queue)) {
      setSoundPlayed(false);
      setAnnounced(false);
      clearTimeout(announceTimeoutRef.current);
    } else if (loaded) {
      playSound();
      announceFirstBuzzer();
    }

    if (!loaded) {
      setLoaded(true);
    }

    queueRef.current = game.G.queue;
  }, [game.G.queue]);

  useEffect(() => () => clearTimeout(announceTimeoutRef.current), []);

  // leave current game
  async function leave() {
    try {
      await leaveRoom(
        game.headerData.roomID,
        game.headerData.playerID,
        game.headerData.credentials
      );
    } catch (error) {
      console.log('leave error', error);
    }
    game.headerData.setAuth({
      playerID: null,
      credentials: null,
      roomID: null,
    });
    history.push('/');
  }

  const attemptBuzz = () => {
    if (!buzzed) {
      playSound();
      game.moves.buzz(game.playerID);
      setBuzzer(true);
      setLastBuzz(Date.now());
    }
  };

  // spacebar will buzz
  useEffect(() => {
    function onKeydown(e) {
      if (e.keyCode === 32 && !e.repeat) {
        buzzButton.current.click();
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  const players = !game.gameMetadata
    ? []
    : game.gameMetadata
        .filter((p) => p.name)
        .map((p) => ({ ...p, id: String(p.id) }));
  // host is lowest active user
  const firstPlayer =
    get(
      sortBy(players, (p) => parseInt(p.id, 10)).filter((p) => p.connected),
      '0'
    ) || null;
  const isHost = get(firstPlayer, 'id') === game.playerID;

  const queue = sortBy(values(game.G.queue), ['timestamp']);
  const buzzedPlayers = queue
    .map((p) => {
      const player = players.find((player) => player.id === p.id);
      if (!player) {
        return {};
      }
      return {
        ...p,
        name: player.name,
        connected: player.connected,
      };
    })
    .filter((p) => p.name);
  // active players who haven't buzzed
  const activePlayers = orderBy(
    players.filter((p) => !some(queue, (q) => q.id === p.id)),
    ['connected', 'name'],
    ['desc', 'asc']
  );

  const timeDisplay = (delta) => {
    if (delta > 1000) {
      return `+${round(delta / 1000, 2)} s`;
    }
    return `+${delta} ms`;
  };

  return (
    <div>
      <Header />
      <Container>
        <section>
          <p id="room-title">Room {game.gameID}</p>
          {!game.isConnected ? (
            <p className="warning">Disconnected - attempting to reconnect...</p>
          ) : null}
          <div id="buzzer">
            <button
              ref={buzzButton}
              disabled={buzzed || game.G.locked}
              onClick={() => {
                if (!buzzed && !game.G.locked) {
                  attemptBuzz();
                }
              }}
            >
              {game.G.locked ? 'Locked' : buzzed ? 'Buzzed' : 'Buzz'}
            </button>
          </div>
          {isHost ? (
            <div className="settings">
              <div className="button-container">
                <button
                  className="text-button"
                  onClick={() => game.moves.toggleLock()}
                >
                  {game.G.locked ? 'Unlock buzzers' : 'Lock buzzers'}
                </button>
              </div>
              <div className="button-container">
                <button
                  disabled={isEmpty(game.G.queue)}
                  onClick={() => game.moves.resetBuzzers()}
                >
                  Reset all buzzers
                </button>
              </div>
              <div className="divider" />
            </div>
          ) : null}
        </section>
        <div className="queue">
          <p>Players Buzzed</p>
          <ul>
            {buzzedPlayers.map(({ id, name, timestamp, connected }, i) => (
              <li key={id} className={isHost ? 'resettable' : null}>
                <div
                  className="player-sign"
                  onClick={() => {
                    if (isHost) {
                      game.moves.resetBuzzer(id);
                    }
                  }}
                >
                  <div className={`name ${!connected ? 'dim' : ''}`}>
                    {name}
                    {!connected ? (
                      <AiOutlineDisconnect className="disconnected" />
                    ) : (
                      ''
                    )}
                  </div>
                  {i > 0 ? (
                    <div className="mini">
                      {timeDisplay(timestamp - queue[0].timestamp)}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="queue">
          <p>Other Players</p>
          <ul>
            {activePlayers.map(({ id, name, connected }) => (
              <li key={id}>
                <div className={`name ${!connected ? 'dim' : ''}`}>
                  {name}
                  {!connected ? (
                    <AiOutlineDisconnect className="disconnected" />
                  ) : (
                    ''
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="game-controls">
          <button className="text-button" onClick={() => setSound(!sound)}>
            {sound ? 'Turn off sound' : 'Turn on sound'}
          </button>
          <button className="text-button" onClick={() => leave()}>
            Leave game
          </button>
        </div>
      </Container>
      <Footer />
    </div>
  );
}
