import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useEffect, useState } from 'react';
import { api } from '../common/api';

function MainLayout() {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    let active = true;
    const load = () => api.getSettings().then(data => { if (active) setSettings(data); }).catch(() => {});
    load(); window.addEventListener('focus', load);
    return () => { active = false; window.removeEventListener('focus', load); };
  }, []);
  return (
    <>
      <Header settings={settings} />
      <main>
        <Outlet />
      </main>
      <Footer settings={settings} />
    </>
  );
}

export default MainLayout;
