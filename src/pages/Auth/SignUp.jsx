import React from 'react';
import { useForm } from 'react-hook-form';

import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig'; 
import './Login.css'; 

const SignUp = () => {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const response =await api.post('/auth/signup',{
        fullName:data.fullName,
        email:data.email,
        academicRollNo:data.academicRollNo,
        password:data.password
      });

      console.log("Registration Success:",response.data);
      alert("Account created! Please log in.");
      navigate('/login');

    } catch (error) {
      console.error("Signup failed", error);
      alert(error.response?.data || "Registration failed. This email might already be in use.");
    }
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-content">
        
        <div className="brand-logo">
          <span className="brand-logo-icon">tk</span>
          <span className="brand-logo-text">tykkit.fr</span>
        </div>

        <h1 className="hero-heading">
          Claim your <span className="text-blue">Access.</span>
        </h1>
        
        <p className="hero-subheading">
          Join the network. Get exclusive entry to the events that actually matter.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
          
          <input 
            type="text" 
            placeholder="Full Name" 
            className="premium-input"
            {...register("fullName", { required: true })} 
          />
          <input 
              type="text"
              placeholder='Student Roll Number (e.g. 2510....)'
              className="premium-input"
              {...register("academicRollNo",{required:true})}
              />
          <input 
            type="email" 
            placeholder="University Email" 
            className="premium-input"
            {...register("email", { required: true })} 
          />

          <input 
            type="password" 
            placeholder="Create Password" 
            className="premium-input"
            {...register("password", { required: true, minLength: 8 })} 
          />

          <button type="submit" className="enter-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Profile...' : 'Sign Up'}
          </button>

        </form>

        <div className="auth-footer">
          Already have an account? <span className="footer-link" onClick={() => navigate('/login')}>Sign In</span>
        </div>

      </div>
    </div>
  );
};

export default SignUp;