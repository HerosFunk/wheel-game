const Result = require('../models/result.model');
const Wheel = require('../models/wheel.model');
const mongoose = require('mongoose');

class ResultService {
    async addResult(wheelId, selectedElementId, elementData, sessionId = null, metadata = {}) {
        try {
            const lastResult = await Result.findOne({ wheel: wheelId }).sort({ spinNumber: -1 });
            const spinNumber = lastResult ? lastResult.spinNumber + 1 : 1;

            const result = new Result({
                wheel: wheelId,
                selectedElement: selectedElementId,
                elementLabel: elementData.label,
                elementWeight: elementData.weight,
                spinNumber,
                sessionId,
                userAgent: metadata.userAgent,
                ipAddress: metadata.ipAddress
            });

            await result.save();

            await Wheel.findByIdAndUpdate(wheelId, {
                totalSpinsCount: spinNumber,
                lastSpinAt: new Date()
            });

            return result;
        } catch (error) {
            throw new Error(`Erreur lors de l'ajout du résultat: ${error.message}`);
        }
    }

    async getWheelResults(wheelId, options = {}) {
        const {
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        try {
            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const results = await Result.find({ wheel: wheelId })
                .populate('selectedElement')
                .sort(sort)
                .skip(skip)
                .limit(limit);

            const total = await Result.countDocuments({ wheel: wheelId });

            return {
                results,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new Error(`Erreur lors de la récupération des résultats: ${error.message}`);
        }
    }

    async getWheelStats(wheelId) {
        try {
            const results = await Result.aggregate([
                { $match: { wheel: new mongoose.Types.ObjectId(wheelId) } },
                {
                    $group: {
                        _id: '$selectedElement',
                        count: { $sum: 1 },
                        label: { $first: '$elementLabel' },
                        weight: { $first: '$elementWeight' },
                        lastSelected: { $max: '$createdAt' }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            const totalSpins = await Result.countDocuments({ wheel: wheelId });

            return {
                totalSpins,
                elementStats: results.map(stat => ({
                    ...stat,
                    percentage: ((stat.count / totalSpins) * 100).toFixed(1)
                }))
            };
        } catch (error) {
            throw new Error(`Erreur lors du calcul des statistiques: ${error.message}`);
        }
    }

    async resetWheelResults(wheelId) {
        try {
            await Result.deleteMany({ wheel: wheelId });
            await Wheel.findByIdAndUpdate(wheelId, {
                totalSpinsCount: 0,
                lastSpinAt: null
            });
            return { message: 'Résultats réinitialisés avec succès' };
        } catch (error) {
            throw new Error(`Erreur lors de la réinitialisation: ${error.message}`);
        }
    }

    async getRecentResults(wheelId, limit = 10) {
        try {
            return await Result.find({ wheel: wheelId })
                .populate('selectedElement')
                .sort({ createdAt: -1 })
                .limit(limit);
        } catch (error) {
            throw new Error(`Erreur lors de la récupération des résultats récents: ${error.message}`);
        }
    }
}

module.exports = new ResultService();