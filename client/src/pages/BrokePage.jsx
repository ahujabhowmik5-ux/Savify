import '../styles/landing.css';
export default function BrokePage() {
  return (
    <div className="landing-body">
      <nav className="landing-navbar">
        <div className="landing-container">
          <div className="landing-nav-inner">
            <a href="/" className="landing-logo">
              <img src="https://i.ibb.co/v441FQJ1/gemini-2-5-flash-image-Refine-this-Savify-S-logo-to-be-flatter-more-geometric-and-ultra-premium.png" alt="Savify" style={{height:32}}/> Savify
            </a>
            <div className="landing-nav-links">
              <a href="/features">Features</a>
              <a href="/pricing">Pricing</a>
              <a href="/login" className="landing-cta-btn">Get Started</a>
            </div>
          </div>
        </div>
      </nav>
      <section style={{padding:'6rem 2rem',maxWidth:800,margin:'0 auto',textAlign:'center'}}>
        <h1 style={{fontFamily:'var(--font-secondary)',fontSize:'3rem',marginBottom:'2rem'}}>Broke</h1>
        <p style={{color:'#718096',lineHeight:1.8,fontSize:'1.1rem'}}>This page content will be ported from the original BrokePage.html file.</p>
        <a href="/" style={{display:'inline-block',marginTop:'2rem',color:'#10B981',fontWeight:600}}>← Back to Home</a>
      </section>
      <footer className="landing-footer">
        <div className="landing-container">
          <p style={{textAlign:'center',color:'#718096',fontSize:'0.9rem'}}>© 2026 Savify Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
