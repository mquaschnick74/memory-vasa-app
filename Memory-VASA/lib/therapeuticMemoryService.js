// lib/therapeuticMemoryService.js - Specialized for therapeutic applications
import mem0Service from './mem0Service.js';
import firebaseMemoryManager from './firebaseMemoryManager.js';

class TherapeuticMemoryService {
  constructor() {
    console.log('Therapeutic Memory Service initialized');
  }

  async processTherapeuticConversation(customUserId, conversationData, therapeuticContext = {}) {
    try {
      console.log(`Processing therapeutic conversation for patient: ${customUserId}`);
      
      // Enhanced conversation data with therapeutic context
      const enrichedData = {
        ...conversationData,
        therapeutic_context: {
          session_type: therapeuticContext.session_type || 'general',
          therapy_stage: therapeuticContext.therapy_stage || 'initial',
          therapeutic_goals: therapeuticContext.goals || [],
          session_number: therapeuticContext.session_number || 1,
          therapist_notes: therapeuticContext.notes || '',
          breakthrough_indicators: this.detectBreakthroughs(conversationData.messages),
          mood_indicators: this.analyzeMoodMarkers(conversationData.messages),
          timestamp: new Date().toISOString()
        }
      };

      // Store in Firebase with therapeutic metadata
      const firebaseResult = await firebaseMemoryManager.saveConversationMemory(
        customUserId, 
        enrichedData
      );

      // Store in Mem0 with therapeutic context for intelligent retrieval
      const mem0Result = await mem0Service.addMemory(
        customUserId,
        enrichedData,
        {
          category: 'therapeutic_session',
          stage: therapeuticContext.therapy_stage,
          session_type: therapeuticContext.session_type,
          importance_score: this.calculateImportanceScore(enrichedData)
        }
      );

      console.log('Therapeutic conversation processed:', {
        firebase_id: firebaseResult,
        mem0_result: mem0Result,
        breakthroughs_detected: enrichedData.therapeutic_context.breakthrough_indicators.length
      });

      return {
        success: true,
        firebase_id: firebaseResult,
        mem0_result: mem0Result,
        therapeutic_insights: enrichedData.therapeutic_context
      };

    } catch (error) {
      console.error('Error processing therapeutic conversation:', error);
      throw error;
    }
  }

  async getTherapeuticHistory(customUserId, options = {}) {
    try {
      console.log(`Retrieving therapeutic history for patient: ${customUserId}`);
      
      const {
        stage_filter = null,
        session_type = null,
        include_breakthroughs_only = false,
        limit = 50
      } = options;

      // Get from both storage systems
      const [firebaseHistory, mem0Memories] = await Promise.all([
        firebaseMemoryManager.getUserMemories(customUserId, limit),
        mem0Service.getMemories(customUserId, limit)
      ]);

      // Filter and enrich therapeutic data
      const therapeuticHistory = this.enrichTherapeuticHistory(
        firebaseHistory, 
        mem0Memories,
        { stage_filter, session_type, include_breakthroughs_only }
      );

      return {
        success: true,
        patient_id: customUserId,
        total_sessions: therapeuticHistory.sessions.length,
        breakthrough_moments: therapeuticHistory.breakthroughs,
        progress_indicators: therapeuticHistory.progress,
        recent_insights: therapeuticHistory.insights,
        history: therapeuticHistory.sessions
      };

    } catch (error) {
      console.error('Error retrieving therapeutic history:', error);
      throw error;
    }
  }

  async searchTherapeuticInsights(customUserId, query, context = {}) {
    try {
      console.log(`Searching therapeutic insights for: ${customUserId}, query: ${query}`);
      
      // Enhanced search with therapeutic context
      const searchResults = await mem0Service.searchMemories(
        customUserId, 
        `${query} therapy breakthrough insight progress`,
        context.limit || 10
      );

      // Analyze and rank therapeutic relevance
      const therapeuticInsights = this.analyzeTherapeuticRelevance(
        searchResults, 
        query,
        context
      );

      return {
        success: true,
        query,
        patient_id: customUserId,
        insights_found: therapeuticInsights.length,
        therapeutic_insights: therapeuticInsights,
        recommendations: this.generateTherapeuticRecommendations(therapeuticInsights)
      };

    } catch (error) {
      console.error('Error searching therapeutic insights:', error);
      throw error;
    }
  }

  async trackProgressIndicators(customUserId, timeframe = '30_days') {
    try {
      console.log(`Tracking progress indicators for: ${customUserId}`);
      
      const history = await this.getTherapeuticHistory(customUserId, {
        limit: 100
      });

      const progressMetrics = {
        mood_progression: this.analyzeMoodProgression(history.history),
        engagement_levels: this.analyzeEngagement(history.history),
        breakthrough_frequency: this.analyzeBreakthroughFrequency(history.history),
        goal_achievement: this.analyzeGoalProgress(history.history),
        session_consistency: this.analyzeSessionConsistency(history.history),
        therapeutic_milestones: this.identifyMilestones(history.history)
      };

      return {
        success: true,
        patient_id: customUserId,
        timeframe,
        progress_score: this.calculateOverallProgress(progressMetrics),
        metrics: progressMetrics,
        recommendations: this.generateProgressRecommendations(progressMetrics)
      };

    } catch (error) {
      console.error('Error tracking progress indicators:', error);
      throw error;
    }
  }

  // Helper methods for therapeutic analysis
  detectBreakthroughs(messages) {
    // Analyze messages for breakthrough indicators
    const breakthroughKeywords = [
      'i realize', 'i understand', 'that makes sense', 'i see now',
      'breakthrough', 'clarity', 'aha moment', 'i feel better',
      'progress', 'improvement', 'understanding'
    ];

    return messages.filter(msg => 
      breakthroughKeywords.some(keyword => 
        msg.content.toLowerCase().includes(keyword)
      )
    ).map(msg => ({
      message: msg.content,
      timestamp: new Date().toISOString(),
      confidence: 0.8 // Could be enhanced with ML
    }));
  }

  analyzeMoodMarkers(messages) {
    // Simple mood analysis - could be enhanced with sentiment analysis
    const positiveWords = ['happy', 'good', 'better', 'positive', 'hopeful'];
    const negativeWords = ['sad', 'anxious', 'worried', 'down', 'stressed'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      positiveWords.forEach(word => {
        if (content.includes(word)) positiveCount++;
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) negativeCount++;
      });
    });

    return {
      positive_indicators: positiveCount,
      negative_indicators: negativeCount,
      overall_sentiment: positiveCount > negativeCount ? 'positive' : 
                        negativeCount > positiveCount ? 'negative' : 'neutral',
      confidence: Math.abs(positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1)
    };
  }

  calculateImportanceScore(conversationData) {
    // Calculate importance based on therapeutic value
    let score = 0.5; // baseline
    
    const breakthroughs = conversationData.therapeutic_context?.breakthrough_indicators || [];
    score += breakthroughs.length * 0.2;
    
    const messageCount = conversationData.messages?.length || 0;
    score += Math.min(messageCount / 20, 0.3); // More messages = potentially more valuable
    
    return Math.min(score, 1.0);
  }

  enrichTherapeuticHistory(firebaseHistory, mem0Memories, filters) {
    // Combine and enrich data from both sources
    // Apply filters and extract therapeutic insights
    return {
      sessions: firebaseHistory || [],
      breakthroughs: [],
      progress: {},
      insights: mem0Memories || []
    };
  }

  analyzeTherapeuticRelevance(searchResults, query, context) {
    // Analyze search results for therapeutic relevance
    return (searchResults.results || []).map(result => ({
      ...result,
      therapeutic_relevance: 0.8, // Could be enhanced with ML
      clinical_significance: 'moderate'
    }));
  }

  generateTherapeuticRecommendations(insights) {
    // Generate recommendations based on insights
    return [
      'Continue exploring breakthrough themes',
      'Focus on mood progression patterns',
      'Consider integrating mindfulness techniques'
    ];
  }

  // Additional analysis methods would go here...
  analyzeMoodProgression(history) { return {}; }
  analyzeEngagement(history) { return {}; }
  analyzeBreakthroughFrequency(history) { return {}; }
  analyzeGoalProgress(history) { return {}; }
  analyzeSessionConsistency(history) { return {}; }
  identifyMilestones(history) { return []; }
  calculateOverallProgress(metrics) { return 0.75; }
  generateProgressRecommendations(metrics) { return []; }
}

export default new TherapeuticMemoryService();
