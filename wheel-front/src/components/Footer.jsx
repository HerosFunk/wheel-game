import './Footer.css';

const Footer = () => {
    return (
        <footer style = {{
            position: "fixed",
            bottom: 0,
            width: "100%",
            textAlign: "center",
            backgroundColor: "black",
            color: "white",
            padding: "10px",
            fontSize: "0.5em",
        }}>
        <p>Made by Léo</p>
        </footer>
    );
    };


export default Footer;