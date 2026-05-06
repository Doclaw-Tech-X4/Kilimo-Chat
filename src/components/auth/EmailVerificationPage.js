import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Email,
  VerifiedUser,
  Refresh
} from '@mui/icons-material';

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, isLoading, error, clearError } = useAuth();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [formError, setFormError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Get user_id from location state or localStorage
  const userId = location.state?.userId || localStorage.getItem('pending_verification_user_id');

  useEffect(() => {
    if (!userId) {
      navigate('/register');
      return;
    }
    
    // Store user_id for page refresh
    localStorage.setItem('pending_verification_user_id', userId);
    
    return () => {
      localStorage.removeItem('pending_verification_user_id');
    };
  }, [userId, navigate]);

  useEffect(() => {
    // Countdown for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setVerificationCode(value);
    
    if (formError) {
      setFormError('');
    }
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      setFormError('Please enter a 6-digit verification code');
      return;
    }
    
    const result = await verifyEmail(userId, verificationCode);
    
    if (result.success) {
      navigate('/login');
    }
  };

  const handleResendCode = async () => {
    try {
      setResendLoading(true);
      setResendSuccess(false);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setResendSuccess(true);
        setCountdown(30); // 30 second cooldown
        setTimeout(() => setResendSuccess(false), 5000);
      } else {
        setFormError(result.detail || 'Failed to resend verification code');
      }
    } catch (error) {
      setFormError('Failed to resend verification code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2c5f2d 0%, #4a8c52 100%)',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={10} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Card sx={{ boxShadow: 'none' }}>
            <CardContent sx={{ p: 4 }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Email
                  sx={{
                    fontSize: 60,
                    color: '#2c5f2d',
                    mb: 2
                  }}
                />
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    color: '#2c5f2d',
                    fontWeight: 'bold',
                    mb: 1
                  }}
                >
                  Verify Your Email
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  We've sent a 6-digit verification code to your email address
                </Typography>
              </Box>

              {/* Success Alert */}
              {resendSuccess && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Verification code sent successfully!
                </Alert>
              )}

              {/* Error Alert */}
              {(error || formError) && (
                <Alert 
                  severity="error" 
                  sx={{ mb: 3 }} 
                  onClose={() => {
                    clearError();
                    setFormError('');
                  }}
                >
                  {error || formError}
                </Alert>
              )}

              {/* Verification Form */}
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Verification Code"
                  value={verificationCode}
                  onChange={handleCodeChange}
                  error={!!formError}
                  helperText="Enter the 6-digit code from your email"
                  margin="normal"
                  inputProps={{
                    maxLength: 6,
                    style: {
                      textAlign: 'center',
                      fontSize: '1.5rem',
                      letterSpacing: '0.5rem'
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VerifiedUser color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="000000"
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading || verificationCode.length !== 6}
                  sx={{
                    py: 1.5,
                    mt: 3,
                    background: '#2c5f2d',
                    '&:hover': {
                      background: '#245624',
                    },
                    textTransform: 'none',
                    fontSize: '1.1rem'
                  }}
                >
                  {isLoading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1, color: 'inherit' }} />
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </Button>
              </form>

              {/* Resend Code */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="text"
                  onClick={handleResendCode}
                  disabled={resendLoading || countdown > 0}
                  startIcon={resendLoading ? <CircularProgress size={16} /> : <Refresh />}
                  sx={{ textTransform: 'none' }}
                >
                  {resendLoading 
                    ? 'Sending...' 
                    : countdown > 0 
                    ? `Resend Code (${countdown}s)` 
                    : 'Resend Code'
                  }
                </Button>
              </Box>

              {/* Help Text */}
              <Box sx={{ mt: 4, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Didn't receive the code?</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Check your spam/junk folder<br/>
                  • Make sure the email address is correct<br/>
                  • Wait a few minutes before requesting a new code
                </Typography>
              </Box>

              {/* Back Button */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="text"
                  onClick={handleBack}
                  sx={{ textTransform: 'none' }}
                >
                  Back to Registration
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Paper>
      </Container>
    </Box>
  );
};

export default EmailVerificationPage;
