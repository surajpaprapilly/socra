import { useState, useEffect } from 'react';

export default function TypedText({ text, speed = 25 }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0;
    let id;
    const tick = () => {
      if (i <= text.length) {
        setShown(text.slice(0, i));
        i++;
        id = setTimeout(tick, speed);
      }
    };
    tick();
    return () => clearTimeout(id);
  }, [text, speed]);
  return (
    <span>
      {shown}
      <span className="inline-block w-[2px] h-[1em] bg-amber ml-[2px] align-text-bottom animate-blink" />
    </span>
  );
}
