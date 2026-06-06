import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Switch, theme } from 'antd';
import {
  DashboardOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  HomeOutlined,
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BulbFilled,
  PartitionOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useAlertStore } from '@/store/useAlertStore';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useAlertStore();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '实时大盘' },
    { key: '/devices', icon: <BulbOutlined />, label: '设备管理' },
    { key: '/rules', icon: <ThunderboltOutlined />, label: '规则编排' },
    { key: '/scenes', icon: <PartitionOutlined />, label: '场景管理' },
    { key: '/alerts', icon: <SafetyOutlined />, label: '告警中心' },
    { key: '/rooms', icon: <HomeOutlined />, label: '房间分组' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  ];

  const userMenu = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const notificationMenu = [
    {
      key: 'alerts',
      icon: <BellOutlined />,
      label: `查看所有告警 (${unreadCount})`,
      onClick: () => navigate('/alerts'),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme={darkMode ? 'dark' : 'light'}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: darkMode ? '#fff' : '#1677ff',
            fontSize: collapsed ? 24 : 20,
            fontWeight: 'bold',
            gap: 8,
          }}
        >
          <BulbFilled />
          {!collapsed && <span>智能家居</span>}
        </div>
        <Menu
          theme={darkMode ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, color: '#666' }}>深色模式</span>
            <Switch checked={darkMode} onChange={setDarkMode} />
            <Dropdown menu={{ items: notificationMenu }} placement="bottomRight">
              <Badge count={unreadCount} size="small">
                <Button type="text" icon={<BellOutlined />} style={{ fontSize: 18 }} />
              </Badge>
            </Dropdown>
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.username || '用户'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
