import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Phone,
  Email,
  Lock,
  Person,
  CheckCircle,
  Google
} from '@mui/icons-material';
import { authAPI } from '../../services/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    phone_number: '',
    full_name: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userId, setUserId] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear general error
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Phone number validation
    if (!formData.phone_number) {
      errors.phone_number = 'Phone number is required';
    } else {
      const phoneRegex = /^(\+2547\d{8}|07\d{8}|7\d{8})$/;
      if (!phoneRegex.test(formData.phone_number.replace(/\s/g, ''))) {
        errors.phone_number = 'Invalid phone number. Use +2547XXXXXXXX or 07XXXXXXXX';
      }
    }
    
    // Full name validation
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    }
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Invalid email address';
      }
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else {
      const passwordErrors = [];
      if (formData.password.length < 8) {
        passwordErrors.push('at least 8 characters');
      }
      if (!/[A-Z]/.test(formData.password)) {
        passwordErrors.push('1 uppercase letter');
      }
      if (!/[a-z]/.test(formData.password)) {
        passwordErrors.push('1 lowercase letter');
      }
      if (!/\d/.test(formData.password)) {
        passwordErrors.push('1 number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
        passwordErrors.push('1 special character');
      }
      
      if (passwordErrors.length > 0) {
        errors.password = `Password must contain ${passwordErrors.join(', ')}`;
      }
    }
    
    // Confirm password validation
    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const result = await register(formData);
    
    if (result.success) {
      setUserId(result.user_id);
      setEmailSent(result.email_sent);
      setRegistrationSuccess(true);
    }
  };

  const handleGoogleRegister = () => {
    authAPI.googleAuth.initiate();
  };

  const handleResendVerification = async () => {
    if (userId) {
      const result = await authAPI.resendVerification(userId);
      if (result.success) {
        setEmailSent(true);
      }
    }
  };

  if (registrationSuccess) {
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
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircle
                  sx={{
                    fontSize: 80,
                    color: '#4caf50',
                    mb: 2
                  }}
                />
                
                <Typography variant="h4" component="h1" gutterBottom>
                  Registration Successful!
                </Typography>
                
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  We've sent a verification code to your email address.
                  Please check your inbox and enter the code to verify your account.
                </Typography>
                
                {emailSent && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Email sent successfully to {formData.email}
                  </Alert>
                )}
                
                <Box sx={{ mb: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={handleResendVerification}
                    disabled={!emailSent}
                    sx={{ mr: 2 }}
                  >
                    Resend Email
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/verify-email', { state: { userId } })}
                    sx={{
                      background: '#2c5f2d',
                      '&:hover': {
                        background: '#245624',
                      }
                    }}
                  >
                    Verify Email
                  </Button>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  Already verified?{' '}
                  <Link
                    to="/login"
                    style={{
                      color: '#2c5f2d',
                      textDecoration: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    Sign In
                  </Link>
                </Typography>
              </CardContent>
            </Card>
          </Paper>
        </Container>
      </Box>
    );
  }

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
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    color: '#2c5f2d',
                    fontWeight: 'bold',
                    mb: 1
                  }}
                >
                  Create Account
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Join KilimoChat and get AI-powered farming assistance
                </Typography>
              </Box>

              {/* Error Alert */}
              {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
                  {error}
                </Alert>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  error={!!formErrors.phone_number}
                  helperText={formErrors.phone_number || '+2547XXXXXXXX or 07XXXXXXXX'}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="+254712345678"
                />

                <TextField
                  fullWidth
                  label="Full Name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  error={!!formErrors.full_name}
                  helperText={formErrors.full_name}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!formErrors.password}
                  helperText={formErrors.password}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={handleChange}
                  error={!!formErrors.confirm_password}
                  helperText={formErrors.confirm_password}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Password Requirements */}
                <Box sx={{ mt: 2, mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Password must contain:
                  </Typography>
                  <List dense>
                    <ListItem sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <Chip size="small" label="8+" />
                      </ListItemIcon>
                      <ListItemText primary="at least 8 characters" />
                    </ListItem>
                    <ListItem sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <Chip size="small" label="A-Z" />
                      </ListItemIcon>
                      <ListItemText primary="1 uppercase letter" />
                    </ListItem>
                    <ListItem sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <Chip size="small" label="a-z" />
                      </ListItemIcon>
                      <ListItemText primary="1 lowercase letter" />
                    </ListItem>
                    <ListItem sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <Chip size="small" label="0-9" />
                      </ListItemIcon>
                      <ListItemText primary="1 number" />
                    </ListItem>
                    <ListItem sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <Chip size="small" label="!@#$" />
                      </ListItemIcon>
                      <ListItemText primary="1 special character" />
                    </ListItem>
                  </List>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  sx={{
                    py: 1.5,
                    background: '#2c5f2d',
                    '&:hover': {
                      background: '#245624',
                    },
                    textTransform: 'none',
                    fontSize: '1.1rem'
                  }}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              {/* Divider */}
              <Box sx={{ my: 3 }}>
                <Divider>
                  <Typography variant="body2" color="text.secondary">
                    OR
                  </Typography>
                </Divider>
              </Box>

              {/* Google Register */}
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={handleGoogleRegister}
                startIcon={<Google />}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  borderColor: '#dadce0',
                  color: '#3c4043',
                  '&:hover': {
                    borderColor: '#dadce0',
                    backgroundColor: '#f8f9fa',
                  }
                }}
              >
                Continue with Google
              </Button>

              {/* Login Link */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    style={{
                      color: '#2c5f2d',
                      textDecoration: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    Sign In
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterPage;
