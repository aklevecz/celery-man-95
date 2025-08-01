/** @type {Record<string, Theme>} */
export const themes = {
  win95: {
    name: "Windows 95",
    id: "win95",
    colors: {
      desktop: "#008080",
      window: "#c0c0c0",
      windowHeader: "#0000ff",
      windowHeaderActive: "#0000ff",
      windowHeaderText: "#ffffff",
      windowBorder: "#c0c0c0",
      button: "#c0c0c0",
      buttonText: "#000000",
      taskbar: "#c0c0c0",
      taskbarText: "#000000",
      text: "#000000",
      textHighlight: "#ffffff",
      shadow: "rgba(0, 0, 0, 0.5)",
    },
  },
  win98: {
    name: "Windows 98",
    id: "win98",
    colors: {
      desktop: "#4a808a",
      window: "#c0c0c0",
      windowHeader: "linear-gradient(90deg, #1084d0 0%, #5cb3cc 100%)",
      windowHeaderActive: "linear-gradient(90deg, #1084d0 0%, #5cb3cc 100%)",
      windowHeaderText: "#ffffff",
      windowBorder: "#c0c0c0",
      button: "#c0c0c0",
      buttonText: "#000000",
      taskbar: "linear-gradient(180deg, #c0c0c0 0%, #a0a0a0 100%)",
      taskbarText: "#000000",
      text: "#000000",
      textHighlight: "#ffffff",
      shadow: "rgba(0, 0, 0, 0.5)",
    },
  },
  winxp: {
    name: "Windows XP",
    id: "winxp",
    colors: {
      desktop: "#5a8bb0",
      window: "#ece9d8",
      windowHeader: "linear-gradient(90deg, #0054e3 0%, #3992d7 50%, #0054e3 100%)",
      windowHeaderActive: "linear-gradient(90deg, #0054e3 0%, #3992d7 50%, #0054e3 100%)",
      windowHeaderText: "#ffffff",
      windowBorder: "#0054e3",
      button: "#ece9d8",
      buttonText: "#000000",
      taskbar: "linear-gradient(180deg, #245edb 0%, #3f73e0 3%, #4f7ce0 6%, #245edb 10%, #245edb 54%, #5088e5 100%)",
      taskbarText: "#ffffff",
      text: "#000000",
      textHighlight: "#ffffff",
      shadow: "rgba(0, 0, 0, 0.3)",
    },
  },
  win2000: {
    name: "Windows 2000",
    id: "win2000",
    colors: {
      desktop: "#3a6ea5",
      window: "#c0c0c0",
      windowHeader: "linear-gradient(90deg, #166499 0%, #5197cc 100%)",
      windowHeaderActive: "linear-gradient(90deg, #166499 0%, #5197cc 100%)",
      windowHeaderText: "#ffffff",
      windowBorder: "#c0c0c0",
      button: "#c0c0c0",
      buttonText: "#000000",
      taskbar: "linear-gradient(180deg, #c0c0c0 0%, #b0b0b0 100%)",
      taskbarText: "#000000",
      text: "#000000",
      textHighlight: "#ffffff",
      shadow: "rgba(0, 0, 0, 0.5)",
    },
  },
};

/** @type {Theme[]} */
export const themeArray = Object.values(themes);
