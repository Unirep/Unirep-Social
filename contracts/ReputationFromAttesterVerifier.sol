// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// 2019 OKIMS

pragma solidity ^0.7.0;

library Pairing {

    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct G1Point {
        uint256 X;
        uint256 Y;
    }

    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }

    /*
     * @return The negation of p, i.e. p.plus(p.negate()) should be zero. 
     */
    function negate(G1Point memory p) internal pure returns (G1Point memory) {

        // The prime q in the base field F_q for G1
        if (p.X == 0 && p.Y == 0) {
            return G1Point(0, 0);
        } else {
            return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
        }
    }

    /*
     * @return The sum of two points of G1
     */
    function plus(
        G1Point memory p1,
        G1Point memory p2
    ) internal view returns (G1Point memory r) {

        uint256[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success,"pairing-add-failed");
    }

    /*
     * @return The product of a point on G1 and a scalar, i.e.
     *         p == p.scalar_mul(1) and p.plus(p) == p.scalar_mul(2) for all
     *         points p.
     */
    function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {

        uint256[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success,"pairing-mul-failed");
    }

    /* @return The result of computing the pairing check
     *         e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
     *         For example,
     *         pairing([P1(), P1().negate()], [P2(), P2()]) should return true.
     */
    function pairing(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {

        G1Point[4] memory p1 = [a1, b1, c1, d1];
        G2Point[4] memory p2 = [a2, b2, c2, d2];

        uint256 inputSize = 24;
        uint256[] memory input = new uint256[](inputSize);

        for (uint256 i = 0; i < 4; i++) {
            uint256 j = i * 6;
            input[j + 0] = p1[i].X;
            input[j + 1] = p1[i].Y;
            input[j + 2] = p2[i].X[0];
            input[j + 3] = p2[i].X[1];
            input[j + 4] = p2[i].Y[0];
            input[j + 5] = p2[i].Y[1];
        }

        uint256[1] memory out;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success,"pairing-opcode-failed");

        return out[0] != 0;
    }
}

contract ReputationFromAttesterVerifier {

    using Pairing for *;

    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct VerifyingKey {
        Pairing.G1Point alpha1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[13] IC;
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alpha1 = Pairing.G1Point(uint256(2753659374964844112766260072104880419801604078082804843943537285161088888978),uint256(18799400311058049139404061488210191069874346067889702044591974434810973225562));
        vk.beta2 = Pairing.G2Point([uint256(16701678412144061311951881873608419284896985541770489501026581486206846275908),uint256(14691390754475355048979761556272110878026910273652196986397967303747744575126)], [uint256(21461554111233540762169117437924801431246934697433875054776748447626031194491),uint256(17402797168176415833773650521786700913024590595876382131533230200744869926866)]);
        vk.gamma2 = Pairing.G2Point([uint256(13089953800534930279306171203730955620966312016441576908675397713497099451708),uint256(8645115689055355010982651637011226069932216036182682513415424199381405335993)], [uint256(20123512944000452612964968701856052781370137664140977602188098148280313858165),uint256(18368206641404641604369850396993230447207643464922540165225708377383661731963)]);
        vk.delta2 = Pairing.G2Point([uint256(12700631498885702990317828021043060789395265053494123373716860512912836651351),uint256(20806766154344295981761429057657642261065809542741551173376735480047807405770)], [uint256(5562495579255590125895249035910854257233884309662807117277493591264450152658),uint256(2258494292683773304781567837021865210525663630818308191673854614070524064110)]);
        vk.IC[0] = Pairing.G1Point(uint256(9205049270872304340134196099636726519010288409699891488118177161040769341110),uint256(2563597699026193067366267461403469772950807939832880099561830367043742387616));
        vk.IC[1] = Pairing.G1Point(uint256(5109967047188655644535245366305700013254337350570731388620320107595818365891),uint256(4641609802127985529293744106075490817511867186666490693250341177759352128318));
        vk.IC[2] = Pairing.G1Point(uint256(2905438290928123077918414011410664435245627205046294093465501828670747246239),uint256(9419707300328352768601999771490278615204065352665285270151984916267550779591));
        vk.IC[3] = Pairing.G1Point(uint256(14811519714981507584580654732121849557508234368470067314327447908363840271467),uint256(13539361629362363865176033345426776903051245070041794113406464886468477074895));
        vk.IC[4] = Pairing.G1Point(uint256(8348893788613692980348974807869855204828784858259383294593148078863860330700),uint256(4752798403926680479440276995971404684296747003043160424019777200828570280374));
        vk.IC[5] = Pairing.G1Point(uint256(19502831948767823593181232411862342602791193250785298874289628464229118754476),uint256(15211801896591230011219863480380284681097333701940338021427597134598028561870));
        vk.IC[6] = Pairing.G1Point(uint256(7965254430053802090901154754055079762018020260540111223000829561938783894208),uint256(17748166593435520465147262822651033368671318591478737600074153972715580261049));
        vk.IC[7] = Pairing.G1Point(uint256(3541417055587445373695313905061077410659981823044045564428518149255969957347),uint256(944004520076438636559791969910756269081749964536630984718813415894460169663));
        vk.IC[8] = Pairing.G1Point(uint256(12855127889494721138643020914734961085279776796464454675876389782678698749031),uint256(9276902219342308474713080778647028653424017560540355213077990988216986956059));
        vk.IC[9] = Pairing.G1Point(uint256(1145759746687026291634092858134403943221317119124118193926738343890351473553),uint256(9359470039663889319840106284623116766310719637272098439300367578206906438107));
        vk.IC[10] = Pairing.G1Point(uint256(11868324977005341585270579520952448278360001855593851702541934006760185629213),uint256(14127034018880924802659165524042630082604738247170081414978862879069626656280));
        vk.IC[11] = Pairing.G1Point(uint256(2917765802934985385108406361095529250524230328686109724140366180575199247160),uint256(20861480029748407966142642729607358616634335337226707520804813545919444210535));
        vk.IC[12] = Pairing.G1Point(uint256(3266836946772392444470048969665793844065988384283022728523794922303996734679),uint256(4735250130677972323761243184671160291485770652923754115817219210952520492731));

    }
    
    /*
     * @returns Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) public view returns (bool) {

        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);

        VerifyingKey memory vk = verifyingKey();

        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);

        // Make sure that proof.A, B, and C are each less than the prime q
        require(proof.A.X < PRIME_Q, "verifier-aX-gte-prime-q");
        require(proof.A.Y < PRIME_Q, "verifier-aY-gte-prime-q");

        require(proof.B.X[0] < PRIME_Q, "verifier-bX0-gte-prime-q");
        require(proof.B.Y[0] < PRIME_Q, "verifier-bY0-gte-prime-q");

        require(proof.B.X[1] < PRIME_Q, "verifier-bX1-gte-prime-q");
        require(proof.B.Y[1] < PRIME_Q, "verifier-bY1-gte-prime-q");

        require(proof.C.X < PRIME_Q, "verifier-cX-gte-prime-q");
        require(proof.C.Y < PRIME_Q, "verifier-cY-gte-prime-q");

        // Make sure that every input is less than the snark scalar field
        //for (uint256 i = 0; i < input.length; i++) {
        for (uint256 i = 0; i < 12; i++) {
            require(input[i] < SNARK_SCALAR_FIELD,"verifier-gte-snark-scalar-field");
            vk_x = Pairing.plus(vk_x, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        }

        vk_x = Pairing.plus(vk_x, vk.IC[0]);

        return Pairing.pairing(
            Pairing.negate(proof.A),
            proof.B,
            vk.alpha1,
            vk.beta2,
            vk_x,
            vk.gamma2,
            proof.C,
            vk.delta2
        );
    }
}