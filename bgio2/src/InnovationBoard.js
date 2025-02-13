import React from 'react';

import {colors, ages, symbols, symbolCounts} from './InnovationGame';
import {cellStyleInnovation, cellStyleSide, facedownCardStyle, tableStyle} from "./styles";
import {message} from "./common";

const symbolImages = {
    'bulb': 'https://jrp-bgio.s3-us-west-2.amazonaws.com/innovation-assets/bulb.png',
    'crown': 'https://jrp-bgio.s3-us-west-2.amazonaws.com/innovation-assets/crown.png',
    'castle': 'https://jrp-bgio.s3-us-west-2.amazonaws.com/innovation-assets/castle.png',
    'leaf': 'https://jrp-bgio.s3-us-west-2.amazonaws.com/innovation-assets/leaf.png',
    'factory': 'https://jrp-bgio.s3-us-west-2.amazonaws.com/innovation-assets/factory.png',
    'clock': 'https://jrp-bgio.s3-us-west-2.amazonaws.com/innovation-assets/clock.png',
    'hex': 'https://jrp-bgio.s3-us-west-2.amazonaws.com/innovation-assets/hex.png',
    '': 'https://jrp-bgio.s3-us-west-2.amazonaws.com/innovation-assets/transparent.png',
}

export class InnovationBoard extends React.Component {
    render() {
        let msg = message(this.props.ctx, this.props.playerID);

        let decks = [];
        ages.forEach(element => decks.push(
            <li>
                Age {element} : {this.props.G.decks[element].length} cards left
            </li>
        ))

        let opp = "0";
        if (this.props.playerID === "0") {
            opp = "1";
        }

        let clickHandlers = {
            myHand: this.props.moves.MeldAction,
            myBoard: this.props.moves.DogmaAction,
            achievements: this.props.moves.AchieveAction,
        }
        if (this.props.ctx.phase === "resolveStack") {
            clickHandlers = {
                myHand: this.props.moves.ClickCard,
                myBoard: this.props.moves.ClickCard,
                myScore: this.props.moves.ClickCard,
            }
        }

        let mySymbols = renderSymbols(symbolCounts(this.props.G[this.props.playerID].board));
        let oppSymbols = renderSymbols(symbolCounts(this.props.G[opp].board));
        let tbody = [];
        tbody.push(renderFacedownZone(this.props.G[opp].hand, "Opp hand"));
        tbody.push(renderBoard(this.props.G[opp].board, "Opp Board", null, oppSymbols));
        tbody.push(renderFacedownZone(this.props.G[opp].score, "Opp score"));
        tbody.push(renderFacedownZone(this.props.G[opp].achievements, "Opp Achievements"));
        tbody.push(renderFacedownZone(this.props.G.achievements, "Available Achievements", clickHandlers.achievements));
        let decksA = Array.of(1, 2, 3, 4, 5).flatMap(age => <td
            style={facedownCardStyle(this.props.G.decks[age].length === 0 ? 'grey' : 'brown')}> Age {age} [{this.props.G.decks[age].length}]</td>);
        let decksB = Array.of(6, 7, 8, 9, 10).flatMap(age => <td
            style={facedownCardStyle(this.props.G.decks[age].length === 0 ? 'grey' : 'brown')}> Age {age} [{this.props.G.decks[age].length}]</td>);
        tbody.push(<tr onClick={() => this.props.moves.DrawAction()}>
            <td style={cellStyleSide('clear', false)}>Decks</td>
            {decksA}</tr>);
        if (this.props.ctx.phase === "resolveStack") {
            // TODO bug - shouldn't stack always have something in it if we have it?
            // if (this.props.G.stack.length !== 0) {
            //     let topStackable = this.props.G.stack[this.props.G.stack - 1];
            //     if (topStackable.menuOptions !== undefined) {
            //         menu = renderList(topStackable.menuOptions, "Menu options", x => x, element => this.props.moves.ClickMenu(element));
            //     }
            // }
            tbody.push(<tr>
                <td style={cellStyleSide('red', false)}>The Stack</td>
                <div>
                    {renderList(this.props.G.stack, "The Stack", x => x.name + "[player " + x.playerID + "]")}
                    {renderList(Array.of("yes", "no"), "Menu options", x => x, element => this.props.moves.ClickMenu(element))}
                </div></tr>);
        }
        tbody.push(<tr onClick={() => this.props.moves.DrawAction()}>
            <td style={cellStyleSide('clear', false)}>Decks</td>
            {decksB}</tr>);
        tbody.push(renderFacedownZone(this.props.G[this.props.playerID].score, "My score", clickHandlers.myScore));
        tbody.push(renderFacedownZone(this.props.G[this.props.playerID].achievements, "My Achievements"));
        tbody.push(renderBoard(this.props.G[this.props.playerID].board, "My Board", clickHandlers.myBoard, mySymbols));
        let handBody = [];
        let handChunked = chunkArrayInGroups(this.props.G[this.props.playerID].hand, 5);
        handChunked.forEach(chunk => handBody.push(renderHand(chunk, clickHandlers.myHand)));
        // TODO: this shouldn't really be inside a tr - seems to make the border a bit wrong.
        tbody.push(<tr>
            <td style={cellStyleSide('clear', false)}>My Hand</td>
            <td colspan="5">
                <table style={tableStyle()}>
                    <tbody>{handBody}</tbody>
                </table>
            </td>
        </tr>);


        let msg1 = '';
        if (this.props.ctx.phase === "resolveStack") {
            // TODO bug - shouldn't stack always have something in it if we have it?
            // if (this.props.G.stack.length !== 0) {
            //     let topStackable = this.props.G.stack[this.props.G.stack - 1];
            //     if (topStackable.menuOptions !== undefined) {
            //         menu = renderList(topStackable.menuOptions, "Menu options", x => x, element => this.props.moves.ClickMenu(element));
            //     }
            // }
            msg1 = <div>
                <h4>Resolving stack...</h4>
                {renderList(this.props.G.stack, "The Stack", x => x.name + "[player " + x.playerID + "]")}
                {renderList(Array.of("yes", "no"), "Menu options", x => x, element => this.props.moves.ClickMenu(element))}
            </div>;
        }
        return (
            <div>
                <h3> Player {this.props.playerID} board {msg}</h3>
                {msg1}
                <table style={tableStyle()}>
                    <tbody>{tbody}</tbody>
                </table>
                {renderList(this.props.G.log, "Log", x => x)}
            </div>
        );
    }
}

function renderList(arr, name, nameFn, onClickFn) {
    let lis = [];
    arr.forEach(element => {
        if (onClickFn === undefined || onClickFn === null) {
            lis.push(
                <li>
                    {nameFn(element)}
                </li>
            )
        } else {
            lis.push(
                <li onClick={() => onClickFn(element)}>
                    {nameFn(element)}
                </li>
            )
        }
    })
    return <div>
        <h4>{name}</h4>
        <ul>{lis}</ul>
    </div>
}

function renderFacedownZone(zone, msg, onClick) {
    let content = zone.flatMap(c => {
        if (onClick === undefined || onClick === null) {
            return <td style={facedownCardStyle('brown')}>{c.age}</td>;
        }
        return <td onClick={() => onClick(c.id)} style={facedownCardStyle('brown')}>{c.age}</td>;
    });
    return <tr>
        <td style={cellStyleSide('clear', false)}>{msg}</td>
        <td colspan="5">
            <table>
                <tr>
                    <td>{content}</td>
                </tr>
            </table>
        </td>
    </tr>;
}

// Board classes.

const cardStyle = {
    'table-layout': 'fixed',
}


const innerCardStyle = {
    'table-layout': 'fixed',
    'word-wrap': 'break-word;',
    border: '1px solid #555',
    // lineHeight: '14px',
}

const cardnameStyle = {
    display: 'inline-block',
    float: 'left',
    'text-align': 'left',
    'font-size': '14px',
}

const dogmaStyle = {
    'font-size': '11px',
}

const ageStyle = {
    display: 'inline-block',
    float: 'right',
    'text-align': 'right',
    'font-size': '14px',
}

const splayShort = {
    '': '',
    'up': 'u',
    'left': 'l',
    'right': 'r',
}

function renderCard(top, extra) {
    let inPlaySymbolSize = '72';
    let dogmaSymbolSize = '16';
    let innerTdata = [];
    innerTdata.push(<tr height="20">
        <td colSpan='2'>
            <b style={cardnameStyle}>{top.name}</b>
        </td>
        <td>
            <b style={ageStyle}>{top.age}{extra}</b>
        </td>
    </tr>);
    top.dogmasEnglish.forEach(txt => innerTdata.push(<tr height="20">
        <td colSpan='3'  height="20">
            <p style={dogmaStyle}><img src={symbolImages[top.mainSymbol]} width={dogmaSymbolSize}
                                       height={dogmaSymbolSize}/> :{txt}</p>
        </td>
    </tr>));

    return <table style={cardStyle} width="300">
        <tr>
            <td>
                <img src={symbolImages[top.symbols[0]]} width={inPlaySymbolSize} height={inPlaySymbolSize}/>
            </td>
            <td colspan='2'>
                <table height="60" width="172" style={innerCardStyle}>
                    {innerTdata}
                </table>
            </td>
        </tr>
        <tr>
            <td>
                <img src={symbolImages[top.symbols[3]]} width={inPlaySymbolSize} height={inPlaySymbolSize}/>
            </td>
            <td>
                <img src={symbolImages[top.symbols[4]]} width={inPlaySymbolSize} height={inPlaySymbolSize}/>
            </td>
            <td>
                <img src={symbolImages[top.symbols[5]]} width={inPlaySymbolSize} height={inPlaySymbolSize}/>
            </td>
        </tr>
    </table>
}

function renderBoard(board, msg, onClick, symbolsRendered) {
    let output = colors.flatMap(c => {
        let pile = board[c];
        if (pile.length === 0) {
            return <td style={cellStyleInnovation(c)}>-</td>;
        }
        let top = pile[pile.length - 1];
        let extra = '';
        let splay = splayShort[board.splay[c]];
        if (pile.length > 1) {
            extra = ' [+' + splay + (pile.length - 1).toString() + ']';
        }
        let cardView = renderCard(top, extra);
        if (onClick === undefined || onClick === null) {
            return <td style={cellStyleInnovation(c)}>{cardView}</td>;
        }
        return <td onClick={() => onClick(top.id)} style={cellStyleInnovation(c)}>{cardView}</td>;
    })
    return <tr>
        <td style={cellStyleSide('clear', false)}>{msg}{symbolsRendered}</td>
        {output}</tr>;
}

function renderHand(hand, onClick) {
    let output = hand.flatMap(c => {
        if (onClick === undefined || onClick === null) {
            return <td style={cellStyleInnovation(c.color)}>{renderCard(c, '')}</td>;
        }
        return <td onClick={() => onClick(c.id)} style={cellStyleInnovation(c.color)}>{renderCard(c, '')}</td>;
    })
    return <tr>
        {output}</tr>;
}

function chunkArrayInGroups(arr, size) {
    let myArray = [];
    for (let i = 0; i < arr.length; i += size) {
        myArray.push(arr.slice(i, i + size));
    }
    return myArray;
}

function renderSymbols(counts) {
    let output = [];
    symbols.forEach(s => {
        output.push(<span><img src={symbolImages[s]} width="16" height="16"/>:{counts[s].toString()} </span>);
    })
    return <div>{output}</div>
}