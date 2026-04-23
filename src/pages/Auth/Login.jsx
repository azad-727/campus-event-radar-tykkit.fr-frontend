import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './Login.css'; 

const Login = () => {
  // We start on the 'splash' view. When they click Enter, we change it to 'form'.
  const [viewState, setViewState] = useState('splash'); 
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const navigate = useNavigate();

  // Create 10 items for the infinite scrolling ticker at the bottom
  const tickerItems = new Array(10).fill("tykkit.{ for real }-///");

  const onSubmit = async (data) => {
    try{
      const response=await api.post('/auth/login',{
        email:data.username,
        password:data.password
      });
      
      const { token,fullName,email, studentId}=response.data;
      
      localStorage.setItem('tykkit_jwt',token);
      localStorage.setItem('tykkit_user',fullName);
      localStorage.setItem('tykkit_email', email);
      localStorage.setItem('tykkit_studentId', studentId);

      console.log("Welcome to tykkit,",fullName);
      navigate('/');

    }catch(error){
      console.error("Login failed:",error.response?.data || "Server error");
      alert(error.response?.data || "Invalid credentials. Try again.");
    }
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-content">
        
        {/* Logo Badge - Present in both views */}
        <div className="logo-badge">
          <span className="brand-logo-icon">tk</span>
          <span className="brand-logo-text">tykkit.fr</span>
        </div>

        {/* --- STATE 1: THE SPLASH SCREEN --- */}
        {viewState === 'splash' && (
          <div className="fade-in">
            <h1 className="hero-heading">
              Your Campus Event. <span className="text-blue">All<br/>in One.</span> Place.
            </h1>
            
            <p className="hero-subheading">
              Access premium ticket to global stages. Share the real moments and define your ultimate flex.
            </p>
            
            <div className="accent-line"></div>

            {/* Clicking this button switches the state to show the form */}
            <button className="enter-button" onClick={() => setViewState('form')}>
              Enter
            </button>

            <div className="auth-footer" onClick={() => navigate('/signup')}>
              Create Account
            </div>
          </div>
        )}

        {/* --- STATE 2: THE LOGIN FORM --- */}
        {viewState === 'form' && (
          <div className="fade-in">
            <h1 className="hero-heading" style={{ fontSize: '32px', marginBottom: '24px' }}>
              Student / User Login
            </h1>
            
            <form onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="input-label">Username or Student Roll Number</label>
                <input 
                  type="text" 
                  placeholder="e.g., student.12345" 
                  className="premium-input"
                  {...register("username", { required: true })} 
                />
              </div>

              <div>
                <label className="input-label">Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="premium-input"
                  {...register("password", { required: true })} 
                />
              </div>

              <button type="submit" className="enter-button" disabled={isSubmitting}>
                {isSubmitting ? 'Authenticating...' : 'Login'}
              </button>
            </form>

            <div className="auth-footer" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Forgot Password?</span>
              <span onClick={() => navigate('/signup')}>Sign-Up</span>
            </div>
          </div>
        )}

      </div>

      {/* The Bottom Scrolling Ticker */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {tickerItems.map((text, i) => (
            <span key={i} className="ticker-item">{text}</span>
          ))}
          {/* Duplicate for seamless infinite loop */}
          {tickerItems.map((text, i) => (
            <span key={`dup-${i}`} className="ticker-item">{text}</span>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Login;