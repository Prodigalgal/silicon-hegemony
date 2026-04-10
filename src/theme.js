/* src/theme.js */
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#00E5FF', // 赛博青 (Cyber Cyan)
            contrastText: '#000000',
        },
        secondary: {
            main: '#FF4081', // 霓虹粉 (Neon Pink)
        },
        background: {
            default: '#050608', // 极深底色
            paper: 'rgba(18, 22, 28, 0.8)', // 半透明黑曜石色
        },
        text: {
            primary: '#E0E0E0',
            secondary: '#90A4AE',
        },
        divider: 'rgba(255, 255, 255, 0.08)',
    },
    typography: {
        fontFamily: '"JetBrains Mono", "Segoe UI", Roboto, Helvetica, Arial, sans-serif', // 科技感字体优先
        h4: { fontWeight: 600, letterSpacing: '0.05em' },
        h5: { fontWeight: 600, letterSpacing: '0.05em' },
        h6: { fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' },
        button: { fontWeight: 700, letterSpacing: '0.05em' },
        body2: { fontSize: '0.85rem' },
    },
    shape: {
        borderRadius: 2, // 更锋利的边缘
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: "#424242 #121212",
                    "&::-webkit-scrollbar": { width: '6px', height: '6px' },
                    "&::-webkit-scrollbar-track": { background: "#121212" },
                    "&::-webkit-scrollbar-thumb": { background: "#424242", borderRadius: '2px' },
                    "&::-webkit-scrollbar-thumb:hover": { background: "#00E5FF" }, // 悬停高亮
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backdropFilter: 'blur(12px)', // 玻璃拟态
                    border: '1px solid rgba(255, 255, 255, 0.08)', // 极细微边框
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                    '&:hover': {
                        border: '1px solid currentColor',
                        boxShadow: '0 0 8px currentColor', // 按钮发光
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(45deg, #0097A7 30%, #00E5FF 90%)',
                    border: 'none',
                    color: '#000',
                },
                containedSecondary: {
                    background: 'linear-gradient(45deg, #C2185B 30%, #FF4081 90%)',
                    border: 'none',
                }
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: '4px', // 方形 Chip
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                },
                filled: {
                    border: 'none',
                }
            }
        },
        MuiListItem: {
            styleOverrides: {
                root: {
                    borderRadius: '4px',
                    marginBottom: '4px',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                },
            },
        },
    },
});