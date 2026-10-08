const AIService = require('../services/ai.service');

/**
 * Controller untuk menangani request tanya AI
 */
const AIController = {
  /**
   * POST /api/ai/ask
   */
  async handleAskAI(req, res) {
    try {
      const { question, context } = req.body;

      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Parameter "question" wajib diisi dan berupa teks.'
        });
      }

      const answer = await AIService.askAI(question.trim(), context || '');

      return res.status(200).json({
        status: 'success',
        data: {
          answer,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('AI Controller Error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Terjadi kesalahan pada server saat memproses pertanyaan AI.'
      });
    }
  }
};

module.exports = AIController;
