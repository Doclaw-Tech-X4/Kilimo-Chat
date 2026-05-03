import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import ChatPage from './components/ChatPage';
import ExpertChatPage from './components/ExpertChatPage';
import RecordPage from './components/RecordPage';
import WeatherPage from './components/WeatherPage';
import MarketPage from './components/MarketPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/expert-chat" element={<ExpertChatPage />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/market" element={<MarketPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
