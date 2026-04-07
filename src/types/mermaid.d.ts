declare module 'mermaid' {
  const mermaid: {
    initialize(config: {
      startOnLoad?: boolean;
      securityLevel?: string;
      fontFamily?: string;
      themeCSS?: string;
      theme?: string;
    }): void;
    render(
      id: string,
      code: string
    ): Promise<{
      svg: string;
      bindFunctions?: (element: HTMLElement) => void;
    }>;
  };

  export default mermaid;
}
