import api from "@/lib/api.ts";

export const contentService = {
  getSlideHtml: async (sessionId: string, slideNumber: number): Promise<string> => {
    try {
      const response = await api.get(`/slides/api/presentations/${sessionId}/slide/${slideNumber}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load HTML for slide ${slideNumber}`);
    }
  },

  getPresentationData: async (sessionId: string): Promise<any> => {
    try {
      const response = await api.get(`/slides/api/presentations/${sessionId}/slides`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load presentation data for session ${sessionId}`);
    }
  },

  getSlideAudio: async (sessionId: string, slideNumber: number): Promise<string> => {
    try {
      const response = await api.get(`/slides/api/presentations/${sessionId}/audio/${slideNumber}`, {
        responseType: "blob",
      });
      return URL.createObjectURL(response.data);
    } catch (error) {
      throw new Error(`Failed to load audio for slide ${slideNumber}`);
    }
  },

  generatePresentation: async (sessionId: string, payload: any): Promise<void> => {
    try {
      await api.post(`/slides/api/presentations/${sessionId}/generate`, payload, {
        timeout: 10000, // Optional: Set a timeout to avoid hanging
      });
    } catch (error) {
      throw new Error(`Failed to initiate content generation for session ${sessionId}`);
    }
  },
};