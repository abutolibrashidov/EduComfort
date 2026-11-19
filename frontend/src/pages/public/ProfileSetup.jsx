import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Steps,
  message,
  Select,
  Upload,
  DatePicker,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  UploadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import './ProfileSetup.css';

const { Option } = Select;

const ProfileSetup = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const steps = [
    {
      title: 'Personal Info',
      icon: <UserOutlined />,
    },
    {
      title: 'Contact Details',
      icon: <PhoneOutlined />,
    },
    {
      title: 'Additional Info',
      icon: <HomeOutlined />,
    },
  ];

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      setFormData({ ...formData, ...values });
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        await handleSubmit({ ...formData, ...values });
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      await axiosClient.post('/public/profile-setup', data);
      message.success('Profile setup completed successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      message.error(error.response?.data?.detail || 'Failed to complete profile setup');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: 'Please enter your first name' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="John"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter your last name' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Doe"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="date_of_birth"
              label="Date of Birth"
              rules={[{ required: true, message: 'Please select your date of birth' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                size="large"
                placeholder="Select date"
              />
            </Form.Item>

            <Form.Item
              name="gender"
              label="Gender"
              rules={[{ required: true, message: 'Please select your gender' }]}
            >
              <Select size="large" placeholder="Select gender">
                <Option value="male">Male</Option>
                <Option value="female">Female</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>
          </>
        );

      case 1:
        return (
          <>
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="john.doe@example.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="phone_number"
              label="Phone Number"
              rules={[{ required: true, message: 'Please enter your phone number' }]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="+998 90 123 45 67"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="emergency_contact"
              label="Emergency Contact"
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="Emergency contact number"
                size="large"
              />
            </Form.Item>
          </>
        );

      case 2:
        return (
          <>
            <Form.Item
              name="address"
              label="Address"
              rules={[{ required: true, message: 'Please enter your address' }]}
            >
              <Input.TextArea
                prefix={<HomeOutlined />}
                placeholder="Street address, city, region"
                rows={3}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="parent_name"
              label="Parent/Guardian Name"
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Parent or guardian name"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="parent_phone"
              label="Parent/Guardian Phone"
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="Parent or guardian phone"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="avatar"
              label="Profile Picture (Optional)"
            >
              <Upload
                name="avatar"
                listType="picture-card"
                maxCount={1}
                beforeUpload={() => false}
              >
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              </Upload>
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="profile-setup-container">
      <div className="profile-setup-content">
        <div className="profile-setup-header">
          <h1>Complete Your Profile</h1>
          <p>Please provide your information to get started</p>
        </div>

        <Card className="profile-setup-card">
          <Steps current={currentStep} items={steps} className="setup-steps" />

          <Form
            form={form}
            layout="vertical"
            className="setup-form"
          >
            <div className="step-content">
              {renderStepContent()}
            </div>

            <div className="step-actions">
              {currentStep > 0 && (
                <Button size="large" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="primary"
                  size="large"
                  onClick={handleNext}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={handleNext}
                  loading={loading}
                >
                  Complete Setup
                </Button>
              )}
            </div>
          </Form>
        </Card>

        <div className="setup-footer">
          <p>Already have an account? <a href="/login">Login here</a></p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;