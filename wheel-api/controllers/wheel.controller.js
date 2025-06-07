const Wheel = require("../models/wheel.model");
const Element = require("../models/element.model");
const io = require("../socket/socket");
const wheelService = require("../services/wheel.service");
const elementService = require("../services/element.service");
const socketIO = require("../socket/socket");
const resultService = require("../services/result.service");

exports.createWheel = async (req, res) => {
	const { name, removeAfterSelection, numberOfSpins, elements } = req.body;

	if (!name || numberOfSpins === undefined) {
		return res.status(400).send({ error: "Missing required fields: name, numberOfSpins" });
	}

	if (removeAfterSelection === undefined) {
		return res.status(400).send({ error: "Missing field: removeAfterSelection" });
	}

	if (!elements || elements.length === 0) {
		return res.status(400).send({ error: "Missing elements - at least one element is required" });
	}

	try {
		const wheel = await Wheel.create({
			name,
			removeAfterSelection,
			numberOfSpins,
			numberOfSpinsLeft: numberOfSpins,
			selectedElement: "",
			isFavorite: false,
			totalSpinsCount: 0,
		});

		const createdElements = [];
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];

			const createdElement = await Element.create({
				label: element.label,
				wheel: wheel._id,
				weight: element.weight || 1,
				isActif: true,
			});

			createdElements.push(createdElement);
		}

		const completeWheel = await Wheel.findById(wheel._id).populate({
			path: "elements",
			model: "Element",
		});

		try {
			socketIO.emitToAll("wheel:created", { wheel: completeWheel });
		} catch (socketError) {
			console.error("Socket error (non-blocking):", socketError);
		}

		return res.status(201).send({
			id: wheel._id,
			_id: wheel._id,
			name: wheel.name,
			removeAfterSelection: wheel.removeAfterSelection,
			numberOfSpins: wheel.numberOfSpins,
			numberOfSpinsLeft: wheel.numberOfSpinsLeft,
			elements: createdElements,
			isFavorite: wheel.isFavorite,
			createdAt: wheel.createdAt,
		});
	} catch (error) {
		console.error("Error creating wheel:", error);
		return res.status(500).send({
			error: "Error creating wheel",
			details: error.message,
		});
	}
};

exports.getWheels = async (req, res) => {
	try {
		const { sortBy, sortOrder, favoriteOnly } = req.query;

		let query = {};

		if (favoriteOnly === "true" || favoriteOnly === true) {
			query.isFavorite = true;
		}

		let sortOptions = {};
		if (sortBy) {
			sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
		} else {
			sortOptions.createdAt = -1;
		}

		const wheels = await Wheel.find(query).sort(sortOptions).populate({
			path: "elements",
			model: "Element",
		});

		return res.status(200).send(wheels);
	} catch (error) {
		console.error("Error getting wheels:", error);
		return res.status(500).send({ error: "Error getting wheels", details: error.message });
	}
};

exports.getWheel = async (req, res) => {

	const { id } = req.params;

	if (!id) {
		return res.status(400).send({ error: "Missing wheel ID" });
	}

	try {
		const wheel = await Wheel.findById(id).populate({
			path: "elements",
			model: "Element",
		});

		if (!wheel) {
			return res.status(404).send({ error: "Wheel not found" });
		}

		return res.status(200).send(wheel);
	} catch (error) {
		console.error("Error getting wheel:", error);
		return res.status(500).send({ error: "Error getting wheel", details: error.message });
	}
};
exports.deleteWheel = async (req, res) => {
	const { id } = req.params;

	if (!id) {
		return res.status(400).send({ error: "Missing fields" });
	}

	try {
		const wheel = await Wheel.findById(id);
		if (!wheel) {
			return res.status(404).send({ error: "Wheel not found" });
		}
		await Element.deleteMany({ wheel: id });
		await wheel.deleteOne();
		socketIO.emitToAll("wheel:deleted", { wheelId: id });
		return res.status(200).send({ message: "Wheel deleted" });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Error deleting wheel" });
	}
};

exports.spinWheel = async (req, res) => {
	const { id } = req.params;

	if (!id) {
		return res.status(400).send({ error: "Missing fields" });
	}

	try {
		const wheel = await Wheel.findById(id);
		if (!wheel) {
			return res.status(404).send({ error: "Wheel not found" });
		}

		const elements = await Element.find({ wheel: id });

		console.log('🔧 All elements from DB:', elements.map(el => ({ 
			id: el._id, 
			label: el.label, 
			isActif: el.isActif,
			weight: el.weight 
		})));

		if (elements.length === 0) {
			return res.status(400).send({ error: "No elements in wheel" });
		}

		if (wheel.numberOfSpinsLeft === 0) {
			return res.status(400).send({ error: "No spins left" });
		}

		const activeElements = elements.filter((element) => element.isActif);

		console.log('🔧 Active elements for spin:', activeElements.map(el => ({ 
			id: el._id, 
			label: el.label, 
			weight: el.weight 
		})));

		const weightedElements = activeElements.flatMap((element) => Array(element.weight).fill(element));

		const randomIndex = Math.floor(Math.random() * weightedElements.length);
		const selectedElement = weightedElements[randomIndex];

		console.log('🔧 Selected element:', {
			id: selectedElement._id,
			label: selectedElement.label,
			weight: selectedElement.weight,
			isActif: selectedElement.isActif
		});

		const sessionId = req.headers["x-session-id"] || req.sessionID || null;

		const metadata = {
			userAgent: req.headers["user-agent"],
			ipAddress: req.ip || req.connection.remoteAddress,
		};

		const result = await resultService.addResult(
			id,
			selectedElement._id,
			{
				label: selectedElement.label,
				weight: selectedElement.weight,
			},
			sessionId,
			metadata
		);

		const recentResults = await resultService.getRecentResults(id, 2);
		const previousResult = recentResults.length > 1 ? recentResults[1] : null;

		if (wheel.removeAfterSelection) {
			await Element.findByIdAndUpdate(selectedElement._id, { isActif: false });
		}

		if (wheel.numberOfSpins !== -1) {
			wheel.numberOfSpinsLeft -= 1;
			await wheel.save();
		}

		const response = {
			result: selectedElement._id,
			dernierResultat: previousResult ? previousResult.selectedElement : null,
			spinNumber: result.spinNumber,
			totalSpins: result.spinNumber,
			resultDetails: {
				id: result._id,
				label: selectedElement.label,
				weight: selectedElement.weight,
				timestamp: result.createdAt,
			},
		};

		io.getIO().emit("spin", response);

		return res.send(response);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ error: "Error spinning wheel" });
	}
};

exports.getWheelResults = async (req, res) => {
	const { id } = req.params;
	const { page = 1, limit = 20, format = "detailed" } = req.query;

	try {
		if (format === "stats") {
			const stats = await resultService.getWheelStats(id);
			return res.json(stats);
		}

		const resultsData = await resultService.getWheelResults(id, {
			page: parseInt(page),
			limit: parseInt(limit),
		});

		return res.json(resultsData);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ error: "Error getting results" });
	}
};

exports.getRecentResults = async (req, res) => {
	const { id } = req.params;
	const { limit = 10 } = req.query;

	try {
		const results = await resultService.getRecentResults(id, parseInt(limit));
		return res.json(results);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ error: "Error getting recent results" });
	}
};

exports.getUserWheels = async (req, res) => {
	try {
		const wheels = await Wheel.find().populate("elements");
		return res.status(200).send(wheels);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ error: "Error getting user wheels" });
	}
};

exports.cloneWheel = async (req, res) => {
	const { id } = req.params;

	if (!id) {
		return res.status(400).send({ error: "Missing fields" });
	}

	try {
		const wheel = await Wheel.findById(id);
		if (!wheel) {
			return res.status(404).send({ error: "Wheel not found" });
		}

		const elements = await Element.find({ wheel: id });

		const newWheel = await Wheel.create({
			name: `${wheel.name} (Copy)`,
			removeAfterSelection: wheel.removeAfterSelection,
			numberOfSpins: wheel.numberOfSpins,
			numberOfSpinsLeft: wheel.numberOfSpins,
			selectedElement: "",
		});

		for (let element of elements) {
			await Element.create({
				label: element.label,
				wheel: newWheel._id,
				weight: element.weight,
				isActif: element.isActif,
			});
		}

		return res.status(201).send(newWheel);
	} catch (error) {
		console.error("error cloning wheel" + error);
		return res.status(500).send({ error: "Error cloning wheel" });
	}
};


exports.updateWheel = async (req, res) => {
  const { id } = req.params;
  const { name, removeAfterSelection, numberOfSpins, elements } = req.body;


  if (!name || numberOfSpins === undefined || !elements || elements.length === 0) {
    return res.status(400).json({ 
      status: "fail",
      message: "Missing required fields: name, numberOfSpins, elements" 
    });
  }

  try {
    const wheel = await Wheel.findById(id);
    if (!wheel) {
      return res.status(404).json({ 
        status: "fail",
        message: "Wheel not found" 
      });
    }

    wheel.name = name;
    wheel.removeAfterSelection = removeAfterSelection;
    wheel.numberOfSpins = numberOfSpins;
    wheel.numberOfSpinsLeft = numberOfSpins;
    await wheel.save();


    const existingElements = await Element.find({ wheel: id });
    const existingElementIds = existingElements.map(el => el._id.toString());  

    const processedElementIds = [];
    
    for (let i = 0; i < elements.length; i++) {
      const elementData = elements[i];

      if (!elementData.label || elementData.label.trim() === '') {
        return res.status(400).json({ 
          status: "fail",
          message: `Element ${i + 1} must have a label` 
        });
      }

      if (elementData._id && existingElementIds.includes(elementData._id)) {
        
        const updatedElement = await Element.findByIdAndUpdate(
          elementData._id, 
          {
            label: elementData.label.trim(),
            weight: elementData.weight || 1,
            isActif: elementData.isActif !== undefined ? elementData.isActif : true,
            updatedAt: Date.now()
          },
          { new: true, runValidators: true }
        );
        
        if (updatedElement) {
          processedElementIds.push(elementData._id);
        }
      } else {
        
        const newElement = await Element.create({
          label: elementData.label.trim(),
          wheel: id,
          weight: elementData.weight || 1,
          isActif: elementData.isActif !== undefined ? elementData.isActif : true,
        });
        
        processedElementIds.push(newElement._id.toString());
      }
    }

    const elementsToDelete = existingElementIds.filter(elementId => 
      !processedElementIds.includes(elementId)
    );
    
    if (elementsToDelete.length > 0) {
      await Element.deleteMany({ _id: { $in: elementsToDelete } });
    }

    const updatedWheel = await Wheel.findById(id).populate({
      path: 'elements',
      model: 'Element'
    });
    
    try {
      socketIO.emitToRoom(`wheel:${id}`, 'wheel:updated', { wheel: updatedWheel });
    } catch (socketError) {
      console.error("Socket error (non-blocking):", socketError);
    }
    
    return res.status(200).json({
      status: "success",
      data: updatedWheel
    });
  } catch (error) {
    console.error("Error updating wheel:", error);
    return res.status(500).json({ 
      status: "error",
      message: "Error updating wheel",
      details: error.message 
    });
  }
};

exports.toggleElementActive = async (req, res) => {
	const { wheelId, elementId } = req.params;
	try {
		const element = await Element.findOne({ _id: elementId, wheel: wheelId });
		if (!element) {
			return res.status(404).json({ message: "Element not found" });
		}
		element.isActif = !element.isActif;
		await element.save();
		const elements = await Element.find({ wheel: wheelId });
		const wheel = await Wheel.findById(wheelId);
		wheel.elements = elements;
		socketIO.emitToRoom(`wheel:${wheelId}`, "element:statusUpdated", { element });
		res.status(200).json(wheel);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

exports.setAllElementsActive = async (req, res) => {
	const { wheelId } = req.params;
	try {
		const elements = await Element.find({ wheel: wheelId });
		if (!elements.length) {
			return res.status(404).json({ message: "No elements found" });
		}
		await Element.updateMany({ wheel: wheelId }, { isActif: true });
		const updatedElements = await Element.find({ wheel: wheelId });
		const wheel = await Wheel.findById(wheelId);
		wheel.elements = updatedElements;
		socketIO.emitToRoom(`wheel:${wheelId}`, "elements:allActivated", { elements: updatedElements });
		res.status(200).json(wheel);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

exports.resetResults = async (req, res) => {
	const { wheelId } = req.params;

	try {
		await resultService.resetWheelResults(wheelId);

		await Element.updateMany({ wheel: wheelId }, { isActif: true });

		const wheel = await Wheel.findById(wheelId).populate("elements");

		socketIO.emitToRoom(`wheel:${wheelId}`, "wheel:reset", { wheelId: wheelId });
		res.status(200).json(wheel);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

exports.getWheelById = async (req, res) => {
	try {
		const wheel = await wheelService.getWheelById(req.params.id);
		res.json(wheel);
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

exports.updateSpinsLeft = async (req, res) => {
	try {
		const wheel = await wheelService.updateSpinsLeft(req.params.id, req.body.spinsLeft);
		res.json(wheel);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

exports.updateSelectedElement = async (req, res) => {
	try {
		const wheel = await wheelService.updateSelectedElement(req.params.id, req.body.selectedElement);
		res.json(wheel);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

exports.getElementsByWheelId = async (req, res) => {
	try {
		const elements = await elementService.getElementsByWheelId(req.params.wheelId);
		res.json(elements);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

exports.createElement = async (req, res) => {
	try {
		const element = await elementService.createElement({
			...req.body,
			wheel: req.params.wheelId,
		});
		res.status(201).json(element);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

exports.updateElement = async (req, res) => {
	try {
		const element = await elementService.updateElement(req.params.elementId, req.body);
		res.json(element);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

exports.deleteElement = async (req, res) => {
	try {
		const result = await elementService.deleteElement(req.params.elementId);
		res.json(result);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

exports.updateElementStatus = async (req, res) => {
	try {
		const element = await elementService.updateElementStatus(req.params.elementId, req.body.isActif);
		socketIO.emitToRoom(`wheel:${element.wheel}`, "element:statusUpdated", { element });
		res.json(element);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

exports.toggleFavorite = async (req, res, next) => {
	try {
		const wheel = await Wheel.findById(req.params.id);
		if (!wheel) {
			return res.status(404).json({ message: "Wheel not found" });
		}
		wheel.isFavorite = !wheel.isFavorite;
		await wheel.save();

		const elements = await Element.find({ wheel: wheel._id });
		wheel.elements = elements;

		socketIO.getIO().emit("wheel:updated", wheel);
		res.json(wheel);
	} catch (error) {
		next(error);
	}
};

exports.getFavoriteWheels = async (req, res, next) => {
	try {
		const wheels = await Wheel.find({ isFavorite: true }).populate("elements");
		res.json(wheels);
	} catch (error) {
		next(error);
	}
};
