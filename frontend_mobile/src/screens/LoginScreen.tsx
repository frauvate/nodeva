import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
    StatusBar,
    ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { login, register, isLoading, error, mode, setMode, clearError } = useAuthStore();
    const { colors, isDark } = useTheme();

    const isLogin = mode === 'login';

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const formAnim = useRef(new Animated.Value(0)).current;
    const orb1Anim = useRef(new Animated.Value(0)).current;
    const orb2Anim = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entry animation
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();

        // Floating orb animation
        const orbLoop = () => {
            Animated.sequence([
                Animated.timing(orb1Anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
                Animated.timing(orb1Anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
            ]).start(orbLoop);
        };
        const orb2Loop = () => {
            Animated.sequence([
                Animated.timing(orb2Anim, { toValue: 1, duration: 5000, useNativeDriver: true }),
                Animated.timing(orb2Anim, { toValue: 0, duration: 5000, useNativeDriver: true }),
            ]).start(orb2Loop);
        };
        setTimeout(orbLoop, 0);
        setTimeout(orb2Loop, 2000);
    }, []);

    useEffect(() => {
        // Form switch animation
        Animated.sequence([
            Animated.timing(formAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
            Animated.spring(formAnim, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }),
        ]).start();
        clearError();
    }, [mode]);

    // Shake on error
    useEffect(() => {
        if (error && !error.startsWith('✉️')) {
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 5, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
            ]).start();
        }
    }, [error]);

    const orb1Translate = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
    const orb2Translate = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -25] });

    const handleSubmit = async () => {
        if (!email || !password) return;
        if (!isLogin && password !== confirmPassword) {
            useAuthStore.setState({ error: 'Şifreler eşleşmiyor.' });
            return;
        }
        if (isLogin) {
            await login(email, password);
        } else {
            await register(email, password);
        }
    };

    const isInfoMessage = error?.startsWith('✉️');

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />

            {/* Background orbs */}
            <Animated.View
                style={[
                    styles.orb,
                    styles.orb1,
                    {
                        backgroundColor: isDark
                            ? 'rgba(99, 102, 241, 0.12)'
                            : 'rgba(99, 102, 241, 0.08)',
                        transform: [{ translateY: orb1Translate }],
                    },
                ]}
            />
            <Animated.View
                style={[
                    styles.orb,
                    styles.orb2,
                    {
                        backgroundColor: isDark
                            ? 'rgba(139, 92, 246, 0.10)'
                            : 'rgba(139, 92, 246, 0.06)',
                        transform: [{ translateY: orb2Translate }],
                    },
                ]}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={[
                        styles.content,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Logo / Brand */}
                    <View style={styles.brand}>
                        <View style={[styles.logoMark, { backgroundColor: colors.accent }]}>
                            <Text style={styles.logoChar}>N</Text>
                        </View>
                        <Text style={[styles.brandName, { color: colors.accent }]}>Nodeva</Text>
                        <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>
                            İş akışınızı görselleştirin
                        </Text>
                    </View>

                    {/* Card */}
                    <Animated.View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.surfaceStrong,
                                borderColor: colors.border,
                                transform: [
                                    { translateY: formAnim },
                                    { translateX: shakeAnim },
                                ],
                            },
                        ]}
                    >
                        {/* Tab switcher */}
                        <View style={[styles.tabs, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.tab, isLogin && [styles.tabActive, { backgroundColor: colors.accent }]]}
                                onPress={() => setMode('login')}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabText, { color: isLogin ? '#fff' : colors.textSecondary }]}>
                                    Giriş Yap
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, !isLogin && [styles.tabActive, { backgroundColor: colors.accent }]]}
                                onPress={() => setMode('register')}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabText, { color: !isLogin ? '#fff' : colors.textSecondary }]}>
                                    Kayıt Ol
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Error / Info message */}
                        {error && (
                            <View style={[
                                styles.messageBox,
                                {
                                    backgroundColor: isInfoMessage
                                        ? 'rgba(16, 185, 129, 0.08)'
                                        : 'rgba(239, 68, 68, 0.08)',
                                    borderColor: isInfoMessage ? colors.success : colors.error,
                                },
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    { color: isInfoMessage ? colors.success : colors.error },
                                ]}>
                                    {error}
                                </Text>
                            </View>
                        )}

                        {/* Email input */}
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>E-posta</Text>
                            <View style={[styles.inputContainer, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
                                <Text style={styles.inputIcon}>✉️</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary }]}
                                    placeholder="ornek@email.com"
                                    placeholderTextColor={colors.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    returnKeyType="next"
                                />
                            </View>
                        </View>

                        {/* Password input */}
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Şifre</Text>
                            <View style={[styles.inputContainer, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    returnKeyType={isLogin ? 'done' : 'next'}
                                    onSubmitEditing={isLogin ? handleSubmit : undefined}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                                    <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm password (register only) */}
                        {!isLogin && (
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Şifre Tekrar</Text>
                                <View style={[styles.inputContainer, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
                                    <Text style={styles.inputIcon}>🔒</Text>
                                    <TextInput
                                        style={[styles.input, { color: colors.textPrimary }]}
                                        placeholder="••••••••"
                                        placeholderTextColor={colors.textMuted}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showPassword}
                                        returnKeyType="done"
                                        onSubmitEditing={handleSubmit}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Submit button */}
                        <TouchableOpacity
                            style={[
                                styles.submitBtn,
                                { backgroundColor: colors.accent },
                                (isLoading || !email || !password) && styles.submitBtnDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={isLoading || !email || !password}
                            activeOpacity={0.85}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.submitBtnText}>
                                    {isLogin ? 'Giriş Yap →' : 'Hesap Oluştur →'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Footer */}
                    <Text style={[styles.footer, { color: colors.textMuted }]}>
                        Nodeva © 2025
                    </Text>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        paddingVertical: 48,
    },

    // Background orbs
    orb: {
        position: 'absolute',
        borderRadius: 999,
    },
    orb1: {
        width: width * 0.9,
        height: width * 0.9,
        top: -width * 0.35,
        left: -width * 0.2,
    },
    orb2: {
        width: width * 0.75,
        height: width * 0.75,
        bottom: -width * 0.3,
        right: -width * 0.2,
    },

    // Brand
    brand: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logoMark: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    logoChar: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -1,
    },
    brandName: {
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -1,
        marginBottom: 6,
    },
    brandTagline: {
        fontSize: 15,
        fontWeight: '400',
    },

    // Card
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },

    // Tabs
    tabs: {
        flexDirection: 'row',
        borderRadius: 14,
        borderWidth: 1,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    tabActive: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Message box
    messageBox: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 16,
    },
    messageText: {
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 18,
    },

    // Input
    inputWrapper: {
        marginBottom: 14,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        height: 52,
    },
    inputIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
    },
    eyeBtn: {
        padding: 4,
        marginLeft: 8,
    },

    // Submit
    submitBtn: {
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    submitBtnDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
        elevation: 0,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    // Footer
    footer: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 12,
    },
});

export default LoginScreen;
