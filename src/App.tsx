import { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TracksSection from './components/TracksSection';
import ArtistsSection from './components/ArtistsSection';
import LabelsSection from './components/LabelsSection';
import EventsSection from './components/EventsSection';
import Player from './components/Player';
import Footer from './components/Footer';
import { tracks, artists, labels, events } from './data/tracks';
import type { Track } from './data/tracks';

export default function App() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  const handleSelect = useCallback((track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(p => !p);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  }, [currentTrack]);

  const handleNext = useCallback(() => {
    if (!currentTrack) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    setCurrentTrack(tracks[(idx + 1) % tracks.length]);
    setIsPlaying(true);
  }, [currentTrack]);

  const handlePrev = useCallback(() => {
    if (!currentTrack) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    setCurrentTrack(tracks[(idx - 1 + tracks.length) % tracks.length]);
    setIsPlaying(true);
  }, [currentTrack]);

  const handleNavigate = useCallback((section: string) => {
    setActiveSection(section);
    if (section === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(section);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar activeSection={activeSection} onNavigate={handleNavigate} />

      <main style={{ paddingTop: '56px', paddingBottom: currentTrack ? '64px' : '0' }}>
        <Hero onNavigate={handleNavigate} />
        <div className="border-t" style={{ borderColor: 'var(--border)' }} />
        <TracksSection
          tracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onSelect={handleSelect}
        />
        <div className="border-t" style={{ borderColor: 'var(--border)' }} />
        <ArtistsSection artists={artists} />
        <div className="border-t" style={{ borderColor: 'var(--border)' }} />
        <LabelsSection labels={labels} />
        <div className="border-t" style={{ borderColor: 'var(--border)' }} />
        <EventsSection events={events} />
        <Footer />
      </main>

      <Player
        track={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(p => !p)}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </div>
  );
}
