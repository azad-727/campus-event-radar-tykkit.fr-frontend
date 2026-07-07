import React from 'react';
import { useForm } from 'react-hook-form';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const ChangePassword = () => {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  
  // Watch the new password to ensure the confirm password matches
  const newPassword = watch("newPassword");

  const onSubmit = async (data) => {
    console.log("Password Change Data:", data);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>Secure Account</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Update your password to stay secure.</p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ position: 'relative' }}>
            <Lock size={20} color="var(--text-secondary)" style={{ position: 'absolute', top: '14px', left: '14px' }} />
            <input 
              type="password" 
              placeholder="Current Password" 
              className="tykkit-input"
              {...register("currentPassword", { required: true })} 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} color="var(--text-secondary)" style={{ position: 'absolute', top: '14px', left: '14px' }} />
            <input 
              type="password" 
              placeholder="New Password" 
              className="tykkit-input"
              {...register("newPassword", { required: true, minLength: 8 })} 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} color="var(--text-secondary)" style={{ position: 'absolute', top: '14px', left: '14px' }} />
            <input 
              type="password" 
              placeholder="Confirm New Password" 
              className="tykkit-input"
              {...register("confirmPassword", { 
                required: true, 
                validate: value => value === newPassword || "Passwords do not match" 
              })} 
            />
            {errors.confirmPassword && <span style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.confirmPassword.message}</span>}
          </div>

          <button type="submit" className="tykkit-button" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>

        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>Back to Login</Link>
        </div>

      </div>
    </div>
  );
};

export default ChangePassword;