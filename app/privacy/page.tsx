import type {Metadata} from 'next';
import Link from 'next/link';
import './privacy.css';

export const metadata:Metadata={
  title:"Privacy — Rayan's Tutorial",
  description:"How Rayan's Tutorial uses account information and saved practice progress.",
};

export default function PrivacyPage(){
  return <div className="privacy-page">
    <header className="public-header">
      <Link className="brand" href="/"><span className="brandmark">R</span><span className="brand-name">Rayan&apos;s <strong>Tutorial</strong></span></Link>
      <Link href="/" className="privacy-back">Back to home</Link>
    </header>
    <main className="privacy-content">
      <span className="eyebrow">YOUR INFORMATION</span>
      <h1>Privacy.</h1>
      <p className="privacy-intro">This notice describes the information used to run your account and save your SHSAT practice in Rayan&apos;s Tutorial.</p>

      <section aria-labelledby="privacy-account">
        <h2 id="privacy-account">Account information</h2>
        <p>When you create an account with email and password, you provide your name and email address. Supabase Auth processes your password and manages authentication. The app&apos;s study database stores your account identifier, email, display name, account role, and account timestamps.</p>
        <p>If you choose Google sign-in, Google and Supabase Auth handle that sign-in. The app receives the basic account information supplied for authentication, including your email, name, and profile image when available. These details connect your sign-in to your practice account.</p>
      </section>

      <section aria-labelledby="privacy-study">
        <h2 id="privacy-study">Saved practice information</h2>
        <p>The app saves your sessions, answers, correctness, time spent answering, results, mistake history, and which questions you have seen. It also saves testing tools you use, such as notes, highlights, flags, eliminated choices, and digital pencil drawings.</p>
        <p>This information lets you resume sessions, review explanations, revisit mistakes, receive practice recommendations, and see skill estimates and progress across devices. The estimates are practice approximations rather than official exam scores.</p>
      </section>

      <section aria-labelledby="privacy-operation">
        <h2 id="privacy-operation">Sign-in cookies and service operation</h2>
        <p>Authentication cookies keep you signed in and allow the app to recognize your session. Repeated email sign-in and sign-up attempts are limited using an IP-based identifier, an attempt count, and a time-window timestamp stored by the app.</p>
        <p>Vercel hosts the website and processes requests to it. Supabase provides authentication and the database that stores account and practice information. Google processes authentication when you choose Google sign-in. These services process information as part of providing those functions.</p>
      </section>

      <section aria-labelledby="privacy-choices">
        <h2 id="privacy-choices">Your account choices</h2>
        <p>Your account and study records stay saved between sessions. You can log out from <strong>Account</strong>. To remove your account, open <strong>Account → Delete my account</strong> and confirm deletion.</p>
        <p>That action deletes your authentication account and its active profile, saved sessions, answers, results, mistake history, and saved testing tools from the app&apos;s database. It does not delete your Google account. IP-based sign-in attempt records are operational records and are separate from your study account.</p>
      </section>

      <section aria-labelledby="privacy-contact">
        <h2 id="privacy-contact">Privacy questions</h2>
        <p>For questions about your information or help with your account, contact <a href="mailto:rayansiddique728@gmail.com">rayansiddique728@gmail.com</a>.</p>
      </section>
    </main>
    <footer className="privacy-footer"><span>Rayan&apos;s Tutorial</span><Link href="/">Return to practice</Link></footer>
  </div>;
}
