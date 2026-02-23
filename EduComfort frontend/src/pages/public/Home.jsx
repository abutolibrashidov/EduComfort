import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [activeSubject, setActiveSubject] = useState('english');

  // Mock data - Replace with API calls
  const certificates = [
    { id: 1, name: 'Alisher Karimov', type: 'IELTS', score: '8.5', subject: 'english', badge: '✓ Verified Graduate' },
    { id: 2, name: 'Dilnoza Abdullayeva', type: 'IELTS', score: '8.0', subject: 'english', badge: '✓ Verified Graduate' },
    { id: 3, name: 'Sardor Rahimov', type: 'Cambridge C1', score: 'Advanced', subject: 'english', badge: '✓ Verified Graduate' },
    { id: 4, name: 'Madina Toshmatova', type: "O'zbek tili", score: "A'lo", subject: 'mothertongue', badge: '✓ Tasdiqlangan' },
    { id: 5, name: 'Jasur Yusupov', type: 'Ona tili', score: '100%', subject: 'mothertongue', badge: '✓ Tasdiqlangan' },
    { id: 6, name: 'Zarina Sayfullayeva', type: 'Matematika', score: '98%', subject: 'math', badge: '✓ Tasdiqlangan' },
    { id: 7, name: 'Bobur Numonov', type: 'Algebra', score: 'A+', subject: 'math', badge: '✓ Tasdiqlangan' },
    { id: 8, name: 'Nigora Sharipova', type: 'IELTS', score: '7.5', subject: 'english', badge: '✓ Verified Graduate' },
  ];

  const duplicatedCertificates = [...certificates, ...certificates];

  const lessons = {
    english: [
      {
        id: 1,
        instructor: '👨‍🏫 Mr. Johnson Smith',
        title: 'Advanced Grammar Mastery',
        description: 'Master complex grammar structures for IELTS Writing Task 2. Learn advanced sentence patterns and cohesive devices.',
      },
      {
        id: 2,
        instructor: '👩‍🏫 Ms. Sarah Williams',
        title: 'Speaking Confidence Builder',
        description: 'Develop fluency and confidence in speaking. Practice with real IELTS topics and feedback techniques.',
      },
      {
        id: 3,
        instructor: '👨‍🏫 Dr. Michael Brown',
        title: 'Academic Writing Techniques',
        description: 'Learn to structure essays, develop arguments, and achieve Band 7+ in IELTS Academic Writing.',
      },
    ],
    mothertongue: [
      {
        id: 1,
        instructor: '👨‍🏫 Ustoz Abdullayev Sardor',
        title: "O'zbek tili grammatikasi",
        description: "O'zbek tilining grammatik qoidalari va to'g'ri yozish san'atini o'rganing. Ilmiy uslubda ifodalash ko'nikmasini rivojlantiring.",
      },
      {
        id: 2,
        instructor: '👩‍🏫 Ustoza Karimova Dilnoza',
        title: 'Adabiy tahlil asoslari',
        description: "Badiiy asarlarni tahlil qilish, she'r va nasrni tushunish ko'nikmalarini rivojlantiring.",
      },
      {
        id: 3,
        instructor: '👨‍🏫 Ustoz Rahimov Jasur',
        title: "Insho yozish san'ati",
        description: "Mukammal insho yozish, fikrlarni mantiqiy ifodalash va boy so'z boyligidan foydalanishni o'rganing.",
      },
    ],
    math: [
      {
        id: 1,
        instructor: '👨‍🏫 Ustoz Yusupov Akmal',
        title: 'Algebra asoslari',
        description: "Algebraning fundamental tushunchalari, tenglama va tengsizliklarni yechish usullarini o'rganing.",
      },
      {
        id: 2,
        instructor: '👩‍🏫 Ustoza Toshmatova Madina',
        title: 'Geometriya sirlari',
        description: "Geometrik shakllar, teoremalar va murakkab masalalarni yechish strategiyalarini o'zlashtiring.",
      },
      {
        id: 3,
        instructor: '👨‍🏫 Ustoz Numonov Bobur',
        title: 'Olimpiada masalalari',
        description: "Matematika olimpiadalariga tayyorgarlik. Mantiqiy fikrlash va ijodiy yondashuvni rivojlantiring.",
      },
    ],
  };

  const events = [
    {
      id: 1,
      emoji: '🎓',
      date: 'February 15, 2026',
      title: 'IELTS Preparation Workshop',
      description: 'Join our intensive IELTS preparation workshop with certified trainers. Learn tips and strategies for all four sections.',
      label: 'REGISTER REQUIRED',
    },
    {
      id: 2,
      emoji: '🏆',
      date: 'March 1, 2026',
      title: 'Academic Excellence Competition',
      description: 'Annual competition for outstanding students. Showcase your skills in English, Math, and Critical Thinking.',
      label: 'OPEN TO ALL',
    },
    {
      id: 3,
      emoji: '💼',
      date: 'March 20, 2026',
      title: 'Career Fair & Alumni Meetup',
      description: 'Meet our successful alumni and explore career opportunities. Network with professionals from various industries.',
      label: 'FREE ENTRY',
    },
  ];

  const getPreviewLabel = (subject) => {
    if (subject === 'english') return 'PREVIEW';
    return "KO'RIB CHIQISH";
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero">
        <div className="hero-content">
          <h1 className="hero-title">EduComfort</h1>
          <p className="hero-subtitle">
            Excellence in Education • Inspiring Success • Building Future Leaders
          </p>
          <div className="cta-buttons">
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Join the Academy
            </button>
            <button className="btn btn-secondary" onClick={() => document.getElementById('achievements').scrollIntoView({ behavior: 'smooth' })}>
              View Achievements
            </button>
          </div>
        </div>
      </div>

      {/* Certificates Section */}
      <div className="section certificates-section" id="achievements">
        <div className="container">
          <h2 className="section-title">Our Success Stories</h2>
          <p className="section-subtitle">
            Join hundreds of successful students who achieved their dreams with EduComfort
          </p>
        </div>

        <div className="carousel-container">
          <div className="carousel-track">
            {duplicatedCertificates.map((cert, index) => (
              <div key={index} className="certificate-card">
                <div className="certificate-avatar">
                  {cert.name.charAt(0)}
                </div>
                <div className="certificate-name">{cert.name}</div>
                <div className="certificate-type">{cert.type}</div>
                <div className="certificate-score">{cert.score}</div>
                <div className="certificate-badge">{cert.badge}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lessons Section */}
      <div className="section lessons-section">
        <div className="container">
          <h2 className="section-title">Featured Lessons</h2>

          <div className="subject-tabs">
            <button
              className={`subject-tab ${activeSubject === 'english' ? 'active' : ''}`}
              onClick={() => setActiveSubject('english')}
            >
              English
            </button>
            <button
              className={`subject-tab ${activeSubject === 'mothertongue' ? 'active' : ''}`}
              onClick={() => setActiveSubject('mothertongue')}
            >
              Ona tili
            </button>
            <button
              className={`subject-tab ${activeSubject === 'math' ? 'active' : ''}`}
              onClick={() => setActiveSubject('math')}
            >
              Matematika
            </button>
          </div>

          <div className="lessons-grid">
            {lessons[activeSubject].map((lesson) => (
              <div key={lesson.id} className="lesson-card">
                <span className="preview-label">{getPreviewLabel(activeSubject)}</span>
                <div className="lesson-instructor">{lesson.instructor}</div>
                <div className="lesson-title">{lesson.title}</div>
                <div className="lesson-description">{lesson.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="section events-section">
        <div className="container">
          <h2 className="section-title">Upcoming Events</h2>
          <div className="events-grid">
            {events.map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-image">{event.emoji}</div>
                <div className="event-content">
                  <div className="event-date">📅 {event.date}</div>
                  <div className="event-title">{event.title}</div>
                  <div className="event-description">{event.description}</div>
                  <span className="preview-label">{event.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="footer-cta">
        <div className="container">
          <h2>Ready to Start Your Success Story with EduComfort?</h2>
          <p>Join EduComfort today and unlock your full potential</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;