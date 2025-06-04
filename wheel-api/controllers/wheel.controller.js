const Wheel = require('../models/wheel.model');
const Element = require('../models/element.model');
const io = require('../socket/socket');

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
                wheelId: wheel.dataValues.id,
                weight: element.weight || 1, // Utilise le poids fourni ou 1 par défaut
                isActif: element.isActif || true, 

            });
        }

        return res.status(201).send(wheel);
    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: "Error creating wheel" });
    }
};

exports.getWheels = async (req, res) => {
    
        try {
            const wheels = await Wheel.findAll({ include: Element });
            return res.status(200).send(wheels);
        } catch (error) {
            return res.status(500).send({ error: "Error getting wheels" });
        }
    
    }


exports.getWheel = async (req, res) => {
    console.log("aaaaa")
    
        const { id } = req.params;
    
        if (!id) {
            return res.status(400).send({ error: "Missing fields" });
        }
    
        try {
            const wheel = await Wheel.findByPk(id);
            if (!wheel) {
                return res.status(404).send({ error: "Wheel not found" });
            }

            const elements = await Element.findAll({ where: { wheelId: id } });
            wheel.dataValues.Elements = elements;
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
        const wheel = await Wheel.findByPk(id);
        if (!wheel) {
            return res.status(404).send({ error: "Wheel not found" });
        }
        await Element.destroy({ where: { wheelId: id } });
        await wheel.destroy();
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
        const wheel = await Wheel.findByPk(id);
        if (!wheel) {
            return res.status(404).send({ error: "Wheel not found" });
        }

        const elements = await Element.findAll({ where: { wheelId: id } });

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
            const elementSelected = await Element.findOne({ where: { id: selectedElement.id } });
            elementSelected.isActif = false;
            await elementSelected.save();
        }

        if (wheel.numberOfSpins === -1) {
            if (wheel.selectedElement == null || wheel.selectedElement === "") {
                wheel.selectedElement = selectedElement.id.toString();
            } else {
                wheel.selectedElement += "," + selectedElement.id;
            }
            await wheel.save();

            if (wheel.selectedElement.split(",").length > 1) {
                const dernierResultat = wheel.selectedElement.split(",")[wheel.selectedElement.split(",").length - 2];
                io.getIO().emit("spin", { result: selectedElement.id, dernierResultat });
                return res.send({ result: selectedElement.id, dernierResultat });
            } else {
                io.getIO().emit("spin", { result: selectedElement.id });
                return res.send({ result: selectedElement.id });
            }
        }

        wheel.numberOfSpinsLeft -= 1;
        if (wheel.selectedElement === "") {
            wheel.selectedElement = selectedElement.id.toString();
        } else {
            wheel.selectedElement += "," + selectedElement.id;
        }
        await wheel.save();

        if (wheel.selectedElement !== null && wheel.selectedElement.split(",").length > 1) {
            const dernierResultat = wheel.selectedElement.split(",")[wheel.selectedElement.split(",").length - 2];
            io.getIO().emit("spin", { result: selectedElement.id, dernierResultat });
            return res.send({ result: selectedElement.id, dernierResultat });
        } else {
            io.getIO().emit("spin", { result: selectedElement.id });
            return res.send({ result: selectedElement.id });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: "Error spinning wheel" });
    }
};

exports.getUserWheels = async (req, res) => {
    try {
        const wheels = await Wheel.findAll();
        const wheelIds = wheels.map(wheel => wheel.id);
        const elements = await Element.findAll({ where: { wheelId: wheelIds } });

        const wheelsWithElements = wheels.map(wheel => {
            return {
                ...wheel.dataValues,
                elements: elements.filter(element => element.wheelId === wheel.id)
            };
        });

        return res.status(200).send(wheelsWithElements);
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
        const wheel = await Wheel.findByPk(id);
        if (!wheel) {
            return res.status(404).send({ error: "Wheel not found" });
        }

        const elements = await Element.findAll({ where: { wheelId: id } });

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
                wheelId: newWheel.id,
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
    const wheel = await Wheel.findByPk(id);
    if (!wheel) {
      return res.status(404).send({ error: "Wheel not found" });
    }

    wheel.name = name;
    wheel.removeAfterSelection = removeAfterSelection;
    wheel.numberOfSpins = numberOfSpins;
    wheel.numberOfSpinsLeft = numberOfSpins;
    await wheel.save();

    await Element.destroy({ where: { wheelId: id } });

    for (let element of elements) {

      let elementCreated = await Element.create({
        label: element.name,
        wheelId: id,
        weight: element.weight || 1,
        isActif: element.isActif !== undefined ? element.isActif : true, 
      });

    }

    return res.status(200).send(wheel);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Error updating wheel" });
  }
};

exports.toggleElementActive = async (req, res) => {
  const { wheelId, elementId } = req.params;
  try {
    const element = await Element.findOne({ where: { id: elementId, wheelId } });
    if (!element) {
      return res.status(404).json({ message: "Element not found" });
    }
    element.isActif = !element.isActif;
    await element.save();
    const elements = await Element.findAll({ where: { wheelId } });
    const wheel = await Wheel.findByPk(wheelId);
    wheel.dataValues.Elements = elements;
    res.status(200).json(wheel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set all elements to active
exports.setAllElementsActive = async (req, res) => {
  const { wheelId } = req.params;
  try {
    const elements = await Element.findAll({ where: { wheelId } });
    if (!elements.length) {
      return res.status(404).json({ message: "No elements found" });
    }
    await Element.update({ isActif: true }, { where: { wheelId } });
    const updatedElements = await Element.findAll({ where: { wheelId } });
    const wheel = await Wheel.findByPk(wheelId);
    wheel.dataValues.Elements = updatedElements;
    res.status(200).json(wheel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset results
exports.resetResults = async (req, res) => {
  const { wheelId } = req.params;
  try {
    const wheel = await Wheel.findByPk(wheelId);
    if (!wheel) {
      return res.status(404).json({ message: "Wheel not found" });
    }
    const elements = await Element.findAll({ where: { wheelId } });
    wheel.selectedElement = "";
    
    await wheel.save();
    wheel.dataValues.Elements = elements
    res.status(200).json(wheel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
