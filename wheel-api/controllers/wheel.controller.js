const Wheel = require('../models/wheel.model');
const Element = require('../models/element.model');
const io = require('../socket/socket');
const wheelService = require('../services/wheel.service');
const elementService = require('../services/element.service');
const socketIO = require('../socket/socket');

exports.createWheel = async (req, res) => {
    const { name, removeAfterSelection, numberOfSpins } = req.body;
    const elements = req.body.elements;

    if (!name || !numberOfSpins) {
        return res.status(400).send({ error: "Missing fields" });
    }

    if (removeAfterSelection === undefined) {
        return res.status(400).send({ error: "Missing fields" });
    }

    if (!elements || elements.length === 0) {
        return res.status(400).send({ error: "Missing elements" });
    }

    try {
        const wheel = await Wheel.create({ 
            name, 
            removeAfterSelection, 
            numberOfSpins, 
            numberOfSpinsLeft: numberOfSpins, 
            selectedElement: "" 
        });

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            await Element.create({ 
                label: element.name, 
                wheel: wheel._id,
                weight: element.weight || 1,
                isActif: element.isActif || true
            });
        }

        socketIO.emitToAll('wheel:created', { wheel });
        return res.status(201).send(wheel);
    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: "Error creating wheel" });
    }
};

exports.getWheels = async (req, res) => {
    try {
        const { sortBy, sortOrder, favoriteOnly } = req.query;
        
        // Construire la requête de base
        let query = {};
        
        // Ajouter le filtre des favoris si demandé
        if (favoriteOnly === 'true' || favoriteOnly === true) {
            query.isFavorite = true;
        }
        
        // Construire l'objet de tri
        let sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        } else {
            sortOptions.createdAt = -1; // Tri par défaut par date de création décroissante
        }
        
        console.log('Query:', query); // Pour le débogage
        console.log('Sort options:', sortOptions); // Pour le débogage
        
        const wheels = await Wheel.find(query)
            .sort(sortOptions)
            .populate('elements');
            
        return res.status(200).send(wheels);
    } catch (error) {
        console.error('Error getting wheels:', error);
        return res.status(500).send({ error: "Error getting wheels" });
    }
};

exports.getWheel = async (req, res) => {
    console.log("aaaaa")
    
        const { id } = req.params;
    
        if (!id) {
            return res.status(400).send({ error: "Missing fields" });
        }
    
        try {
            const wheel = await Wheel.findById(id).populate('elements');
            if (!wheel) {
                return res.status(404).send({ error: "Wheel not found" });
            }
            return res.status(200).send(wheel);
        } catch (error) {
            console.error(error);
            return res.status(500).send({ error: "Error getting wheel" });
        }
    
    }


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
        socketIO.emitToAll('wheel:deleted', { wheelId: id });
        return res.status(200).send({ message: "Wheel deleted" });
    } catch (error) {
        console.log(error)
        return res.status(500).send({ error: "Error deleting wheel" });
    }

}

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

        if (elements.length === 0) {
            return res.status(400).send({ error: "No elements in wheel" });
        }

        if (wheel.numberOfSpinsLeft === 0) {
            return res.status(400).send({ error: "No spins left" });
        }

        const activeElements = elements.filter(element => element.isActif);
        
        // Création d'un tableau avec les éléments répétés selon leur poids
        const weightedElements = activeElements.flatMap(element => 
            Array(element.weight).fill(element)
        );

        // Sélection aléatoire parmi les éléments pondérés
        const randomIndex = Math.floor(Math.random() * weightedElements.length);
        const selectedElement = weightedElements[randomIndex];
        
        if (wheel.removeAfterSelection) {
            await Element.findByIdAndUpdate(selectedElement._id, { isActif: false });
        }

        if (wheel.numberOfSpins === -1) {
            if (!wheel.selectedElement) {
                wheel.selectedElement = selectedElement._id.toString();
            } else {
                wheel.selectedElement += "," + selectedElement._id;
            }
            await wheel.save();

            if (wheel.selectedElement.split(",").length > 1) {
                const dernierResultat = wheel.selectedElement.split(",")[wheel.selectedElement.split(",").length - 2];
                io.getIO().emit("spin", { result: selectedElement._id, dernierResultat });
                return res.send({ result: selectedElement._id, dernierResultat });
            } else {
                io.getIO().emit("spin", { result: selectedElement._id });
                return res.send({ result: selectedElement._id });
            }
        }

        wheel.numberOfSpinsLeft -= 1;
        if (!wheel.selectedElement) {
            wheel.selectedElement = selectedElement._id.toString();
        } else {
            wheel.selectedElement += "," + selectedElement._id;
        }
        await wheel.save();

        if (wheel.selectedElement && wheel.selectedElement.split(",").length > 1) {
            const dernierResultat = wheel.selectedElement.split(",")[wheel.selectedElement.split(",").length - 2];
            io.getIO().emit("spin", { result: selectedElement._id, dernierResultat });
            return res.send({ result: selectedElement._id, dernierResultat });
        } else {
            io.getIO().emit("spin", { result: selectedElement._id });
            return res.send({ result: selectedElement._id });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: "Error spinning wheel" });
    }
};

exports.getUserWheels = async (req, res) => {
    try {
        const wheels = await Wheel.find().populate('elements');
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
                isActif: element.isActif
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
    return res.status(400).send({ error: "Missing fields" });
  }

  try {
    const wheel = await Wheel.findById(id);
    if (!wheel) {
      return res.status(404).send({ error: "Wheel not found" });
    }

    wheel.name = name;
    wheel.removeAfterSelection = removeAfterSelection;
    wheel.numberOfSpins = numberOfSpins;
    wheel.numberOfSpinsLeft = numberOfSpins;
    await wheel.save();

    await Element.deleteMany({ wheel: id });

    for (let element of elements) {

      let elementCreated = await Element.create({
        label: element.name,
        wheel: id,
        weight: element.weight || 1,
        isActif: element.isActif !== undefined ? element.isActif : true, 
      });

    }

    socketIO.emitToRoom(`wheel:${id}`, 'wheel:updated', { wheel });
    return res.status(200).send(wheel);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Error updating wheel" });
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
    socketIO.emitToRoom(`wheel:${wheelId}`, 'element:statusUpdated', { element });
    res.status(200).json(wheel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set all elements to active
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
    socketIO.emitToRoom(`wheel:${wheelId}`, 'elements:allActivated', { elements: updatedElements });
    res.status(200).json(wheel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset results
exports.resetResults = async (req, res) => {
  const { wheelId } = req.params;
  try {
    const wheel = await Wheel.findById(wheelId);
    if (!wheel) {
      return res.status(404).json({ message: "Wheel not found" });
    }
    const elements = await Element.find({ wheel: wheelId });
    wheel.selectedElement = "";
    
    await wheel.save();
    wheel.elements = elements
    socketIO.emitToRoom(`wheel:${wheelId}`, 'wheel:reset', { wheelId: wheelId });
    res.status(200).json(wheel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer une roue par son ID
exports.getWheelById = async (req, res) => {
    try {
        const wheel = await wheelService.getWheelById(req.params.id);
        res.json(wheel);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

// Mettre à jour le nombre de spins restants
exports.updateSpinsLeft = async (req, res) => {
    try {
        const wheel = await wheelService.updateSpinsLeft(req.params.id, req.body.spinsLeft);
        res.json(wheel);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour l'élément sélectionné
exports.updateSelectedElement = async (req, res) => {
    try {
        const wheel = await wheelService.updateSelectedElement(req.params.id, req.body.selectedElement);
        res.json(wheel);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Récupérer tous les éléments d'une roue
exports.getElementsByWheelId = async (req, res) => {
    try {
        const elements = await elementService.getElementsByWheelId(req.params.wheelId);
        res.json(elements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Créer un nouvel élément
exports.createElement = async (req, res) => {
    try {
        const element = await elementService.createElement({
            ...req.body,
            wheel: req.params.wheelId
        });
        res.status(201).json(element);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour un élément
exports.updateElement = async (req, res) => {
    try {
        const element = await elementService.updateElement(req.params.elementId, req.body);
        res.json(element);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un élément
exports.deleteElement = async (req, res) => {
    try {
        const result = await elementService.deleteElement(req.params.elementId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour le statut d'un élément
exports.updateElementStatus = async (req, res) => {
    try {
        const element = await elementService.updateElementStatus(req.params.elementId, req.body.isActif);
        socketIO.emitToRoom(`wheel:${element.wheel}`, 'element:statusUpdated', { element });
        res.json(element);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Basculer le statut favori d'une roue
exports.toggleFavorite = async (req, res, next) => {
    try {
        const wheel = await Wheel.findById(req.params.id);
        if (!wheel) {
            return res.status(404).json({ message: "Wheel not found" });
        }
        wheel.isFavorite = !wheel.isFavorite;
        await wheel.save();
        
        // Récupérer les éléments de la roue
        const elements = await Element.find({ wheel: wheel._id });
        wheel.elements = elements;
        
        socketIO.getIO().emit('wheel:updated', wheel);
        res.json(wheel);
    } catch (error) {
        next(error);
    }
};

// Récupérer uniquement les roues favorites
exports.getFavoriteWheels = async (req, res, next) => {
    try {
        const wheels = await Wheel.find({ isFavorite: true }).populate('elements');
        res.json(wheels);
    } catch (error) {
        next(error);
    }
};
